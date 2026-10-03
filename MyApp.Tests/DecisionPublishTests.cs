using System.Text;
using System.Text.Json.Nodes;
using System.Text.Json;
using NUnit.Framework;
using ServiceStack;
using ServiceStack.Testing;
using ServiceStack.Data;
using ServiceStack.OrmLite;
using ServiceStack.Auth;
using MyApp.ServiceModel;
using MyApp.ServiceInterface;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace MyApp.Tests;

[TestFixture]
public class DecisionPublishTests : TestBase
{
    static string FixturePath => Path.Combine(TestContext.CurrentContext.TestDirectory, "fixtures", "jev-sharing-contract.json");
    public static IEnumerable<TestCaseData> Fixtures()
    {
        var cases = JsonNode.Parse(File.ReadAllText(FixturePath))!.AsArray();
        foreach (var c in cases) yield return new TestCaseData(c!.ToJsonString(), c["valid"]!.GetValue<bool>()).SetName("Decision_contract_" + c["name"]!.GetValue<string>());
    }
    [TestCaseSource(nameof(Fixtures))]
    public void Contract_agrees_with_Python(string json, bool valid)
    {
        var c = DecisionDocumentValidator.Parse(json, DecisionDocumentValidator.EnvelopeLimit);
        if (valid) Assert.DoesNotThrow(() => DecisionPublishServices.Snapshot(c));
        else Assert.Throws<HttpError>(() => DecisionPublishServices.Snapshot(c));
    }
    [Test]
    public void Filename_rejects_header_controls_reserved_names_and_utf8_overflow()
    {
        foreach (var name in new[] { "CON.json", "../file.json", "a\r\nb.json", new string('例', 81) + ".json", "_drafts.json", "a..json" })
            Assert.Throws<HttpError>(() => DecisionDocumentValidator.Filename(name), name);
        foreach (var name in new[] { "café.例.json", "my recipe.json", "sentiment.json" }) Assert.DoesNotThrow(() => DecisionDocumentValidator.Filename(name));
    }
    [Test]
    public void Limits_and_unknown_keywords_are_checked()
    {
        var c = JsonNode.Parse(File.ReadAllText(FixturePath))!.AsArray()[0]!.DeepClone().AsObject();
        c["document"]!["name"] = new string('x', 513 * 1024);
        Assert.Throws<HttpError>(() => DecisionPublishServices.Snapshot(c));
        var deep = "{\"a\":" + new string('[', 40) + "0" + new string(']', 40) + "}";
        Assert.Throws<HttpError>(() => DecisionDocumentValidator.Parse(deep, DecisionDocumentValidator.EnvelopeLimit));
    }
    ServiceStackHost host = null!; string dbPath = ""; IDbConnectionFactory factory = null!;
    [SetUp]
    public void Setup()
    {
        dbPath = Path.Combine(Path.GetTempPath(), "jev-recipes-" + Guid.NewGuid() + ".sqlite");
        factory = new OrmLiteConnectionFactory(dbPath, SqliteDialect.Provider);
        host = new BasicAppHost { ConfigureContainer = container => { container.Register(factory); container.Register<IDbConnectionFactory>(factory); container.AddTransient<DecisionPublishServices>(); } }.Init();
        using var db = factory.Open();
        // Frozen migration creates a table compatible with the runtime projection.
        db.CreateTable<MyApp.Migrations.Migration1010.PublishedDecision>(); db.CreateTable<User>();
    }
    [TearDown]
    public void Cleanup() { host.Dispose(); File.Delete(dbPath); }
    DecisionPublishServices Service(string owner)
    {
        var req = new MockHttpRequest { PathInfo = "/publish/decision", UserHostAddress = "test-" + Guid.NewGuid() };
        req.Items[Keywords.ApiKey] = new ApiKey { UserAuthId = owner };
        var service = host.Container.Resolve<DecisionPublishServices>(); service.Request = req; return service;
    }
    JsonObject Body()
    {
        var c = JsonNode.Parse(File.ReadAllText(FixturePath))!.AsArray().First(x => x!["valid"]!.GetValue<bool>())!.AsObject();
        return new JsonObject { ["filename"] = c["filename"]!.DeepClone(), ["document"] = c["document"]!.DeepClone(), ["execution"] = c["execution"]!.DeepClone(), ["idempotencyKey"] = Guid.NewGuid().ToString("N") };
    }
    static MemoryStream Stream(JsonObject body) => new(Encoding.UTF8.GetBytes(body.ToJsonString()));
    static JsonObject Result(object response) => JsonNode.Parse(((HttpResult)response).ResponseText)!.AsObject();
    [Test]
    public async Task Lifecycle_idempotency_ownership_revisions_and_revocation()
    {
        var service = Service("alice"); var body = Body();
        var created = Result(await service.Post(new PublishDecision { RequestStream = Stream(body) }));
        var reference = created["externalRef"]!.GetValue<string>();
        var retry = Result(await service.Post(new PublishDecision { RequestStream = Stream(body) }));
        Assert.That(retry["externalRef"]!.GetValue<string>(), Is.EqualTo(reference));
        var changed = body.DeepClone().AsObject(); changed["document"]!["description"] = "Changed";
        Assert.That(Assert.ThrowsAsync<HttpError>(async () => await service.Post(new PublishDecision { RequestStream = Stream(changed) }))!.Status, Is.EqualTo(409));
        var other = Service("bob"); changed["revision"] = 1;
        Assert.That(Assert.ThrowsAsync<HttpError>(async () => await other.Put(new UpdatePublishedDecision { ExternalRef = reference, RequestStream = Stream(changed) }))!.Status, Is.EqualTo(403));
        var independent = Result(await other.Post(new PublishDecision { RequestStream = Stream(body) }));
        Assert.That(independent["externalRef"]!.GetValue<string>(), Is.Not.EqualTo(reference));
        body["revision"] = 1; var noop = Result(await service.Put(new UpdatePublishedDecision { ExternalRef = reference, RequestStream = Stream(body) }));
        Assert.That(noop["revision"]!.GetValue<int>(), Is.EqualTo(1));
        var updated = Result(await service.Put(new UpdatePublishedDecision { ExternalRef = reference, RequestStream = Stream(changed) }));
        Assert.That(updated["revision"]!.GetValue<int>(), Is.EqualTo(2));
        Assert.That(Assert.ThrowsAsync<HttpError>(async () => await service.Delete(new UnpublishDecision { ExternalRef = reference, Revision = 1 }))!.Status, Is.EqualTo(409));
        await service.Delete(new UnpublishDecision { ExternalRef = reference, Revision = 2 });
        await service.Delete(new UnpublishDecision { ExternalRef = reference, Revision = 2 });
        Assert.That(Assert.ThrowsAsync<HttpError>(async () => await service.Get(new GetPublishedDecision { ExternalRef = reference }))!.Status, Is.EqualTo(404));
        Assert.That(Assert.ThrowsAsync<HttpError>(async () => await service.Post(new PublishDecision { RequestStream = Stream(body) }))!.Status, Is.EqualTo(409));
        using var db = factory.Open(); Assert.That(db.Count<PublishedDecision>(), Is.EqualTo(2));
        var restored = db.Single<PublishedDecision>(x => x.ExternalRef == reference);
        Assert.That(JsonNode.DeepEquals(JsonNode.Parse(restored.ExecutionJson), body["execution"]), Is.True);
    }
    [Test]
    public async Task Envelope_is_bounded_before_deserialization_and_public_projection_is_allowlisted()
    {
        var service = Service("alice"); var body = Body();
        var oversized = new MemoryStream(new byte[DecisionDocumentValidator.EnvelopeLimit + 1]);
        Assert.That(Assert.ThrowsAsync<HttpError>(async () => await service.Post(new PublishDecision { RequestStream = oversized }))!.Status, Is.EqualTo(413));
        var receipt = Result(await service.Post(new PublishDecision { RequestStream = Stream(body) }));
        var detail = Result(await service.Get(new GetPublishedDecision { ExternalRef = receipt["externalRef"]!.GetValue<string>() }));
        Assert.That(detail.ContainsKey("publishedBy"), Is.False); Assert.That(detail.ContainsKey("createIdempotencyKey"), Is.False);
        Assert.That(detail["execution"], Is.Not.Null); Assert.That(detail["document"], Is.Not.Null);
    }
    [Test]
    public void PostgreSQL_migration_has_text_payloads_and_owner_scoped_unique_receipts()
    {
        var dialect = PostgreSqlDialect.Provider;
        var table = typeof(MyApp.Migrations.Migration1010.PublishedDecision);
        var sql = dialect.ToCreateTableStatement(table);
        foreach (var column in new[] { "document_json", "execution_json", "description", "tags" })
            Assert.That(sql, Does.Match("\"?" + column + "\"?\\s+text").IgnoreCase);
        var indexes = string.Join("\n", dialect.ToCreateIndexStatements(table));
        Assert.That(indexes, Does.Contain("UNIQUE"));
        Assert.That(indexes, Does.Contain("published_by"));
        Assert.That(indexes, Does.Contain("create_idempotency_key"));
    }

    [Test]
    public void PostgreSQL_round_trip_in_an_isolated_schema_when_configured()
    {
        var connection = Environment.GetEnvironmentVariable("JEV_TEST_POSTGRES");
        if (string.IsNullOrEmpty(connection)) Assert.Ignore("Set JEV_TEST_POSTGRES to a disposable PostgreSQL database to run this check.");
        var pg = new OrmLiteConnectionFactory(connection, PostgreSqlDialect.Provider);
        using var db = pg.Open();
        var schema = "jev_test_" + Guid.NewGuid().ToString("N");
        db.ExecuteSql("CREATE SCHEMA " + schema);
        try
        {
            db.ExecuteSql("SET search_path TO " + schema);
            db.CreateTable<MyApp.Migrations.Migration1010.PublishedDecision>();
            var cases = JsonNode.Parse(File.ReadAllText(FixturePath))!.AsArray();
            foreach (var fixture in cases.Where(x => x!["valid"]!.GetValue<bool>()))
            {
                var row = DecisionPublishServices.Snapshot(fixture!.AsObject());
                row.PublishedBy = "fixture-owner";
                row.ExternalRef = Guid.NewGuid().ToString("N");
                row.CreateIdempotencyKey = Guid.NewGuid().ToString("N");
                row.CreateRequestHash = row.ContentHash;
                row.Revision = 1;
                row.PublishedAt = row.UpdatedAt = DateTime.UtcNow;
                row.Id = db.Insert(row, selectIdentity: true);
                var restored = db.SingleById<PublishedDecision>(row.Id);
                Assert.That(JsonNode.DeepEquals(JsonNode.Parse(restored.DocumentJson), fixture["document"]), Is.True);
                Assert.That(JsonNode.DeepEquals(JsonNode.Parse(restored.ExecutionJson), fixture["execution"]), Is.True);
                Assert.That(restored.ContentHash, Is.EqualTo(row.ContentHash));
            }
        }
        finally
        {
            db.ExecuteSql("SET search_path TO public");
            db.ExecuteSql("DROP SCHEMA " + schema + " CASCADE");
        }
    }

}
