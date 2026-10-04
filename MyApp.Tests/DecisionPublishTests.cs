using System.Text;
using System.Text.Json.Nodes;
using System.Text.Json;
using NUnit.Framework;
using Microsoft.Extensions.Configuration;
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
    public void Catalog_request_types_have_distinct_routes()
    {
        var publicRoutes = Attribute.GetCustomAttributes(typeof(QueryPublishedDecisions), typeof(RouteAttribute), true).Cast<RouteAttribute>().Select(x => x.Path).ToArray();
        var ownerRoutes = Attribute.GetCustomAttributes(typeof(MyPublishedDecisions), typeof(RouteAttribute), true).Cast<RouteAttribute>().Select(x => x.Path).ToArray();
        Assert.That(publicRoutes, Is.EqualTo(new[] { "/publish/decisions" }));
        Assert.That(ownerRoutes, Is.EqualTo(new[] { "/publish/decisions/mine" }));
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
    DecisionPublishingOptions TagOptions = null!;
    sealed class StubTagger : IDecisionTagger
    {
        public int Calls;
        public List<string> Result = ["content", "verification"];
        public Task<List<string>> InferTags(JsonObject recipe) { Calls++; return Task.FromResult(Result.ToList()); }
    }
    StubTagger tagger = null!;
    ServiceStackHost host = null!; string dbPath = ""; IDbConnectionFactory factory = null!;
    [SetUp]
    public void Setup()
    {
        dbPath = Path.Combine(Path.GetTempPath(), "jev-recipes-" + Guid.NewGuid() + ".sqlite");
        factory = new OrmLiteConnectionFactory(dbPath, SqliteDialect.Provider);
        TagOptions = new ConfigurationBuilder().AddJsonFile(Path.Combine(TestContext.CurrentContext.TestDirectory, "fixtures", "decision-publishing.json")).Build()
            .GetSection("DecisionPublishing").Get<DecisionPublishingOptions>()!;
        TagOptions.Validate(); tagger = new StubTagger();
        host = new BasicAppHost { ConfigureContainer = container => { container.Register(factory); container.Register<IDbConnectionFactory>(factory); container.Register(TagOptions); container.Register<IDecisionTagger>(tagger); container.AddTransient<DecisionPublishServices>(); } }.Init();
        using var db = factory.Open();
        // Frozen migration creates a table compatible with the runtime projection.
        db.CreateTable<MyApp.Migrations.Migration1010.PublishedDecision>();
        db.AddColumn<MyApp.Migrations.Migration1011.PublishedDecision>(x => x.PublisherStarred);
        db.AddColumn<MyApp.Migrations.Migration1011.PublishedDecision>(x => x.PublisherRunCount); db.CreateTable<User>();
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
    [TestCase("publisherStarred", "\"yes\"")]
    [TestCase("publisherStarred", "null")]
    [TestCase("publisherRunCount", "-1")]
    [TestCase("publisherRunCount", "1.5")]
    [TestCase("publisherRunCount", "2147483648")]
    public void Usage_metadata_is_validated(string field, string value)
    {
        var body = Body(); body[field] = JsonNode.Parse(value);
        Assert.Throws<HttpError>(() => DecisionPublishServices.Snapshot(body));
    }
    [Test]
    public async Task Usage_updates_are_revisioned_and_legacy_clients_preserve_signals()
    {
        var service = Service("usage"); var body = Body();
        var created = Result(await service.Post(new PublishDecision { RequestStream = Stream(body) }));
        Assert.That(created["publisherRunCount"]!.GetValue<int>(), Is.Zero);
        var reference = created["externalRef"]!.GetValue<string>();
        body["publisherStarred"] = true; body["publisherRunCount"] = 12; body["revision"] = 1;
        var updated = Result(await service.Put(new UpdatePublishedDecision { ExternalRef = reference, RequestStream = Stream(body) }));
        Assert.That(updated["revision"]!.GetValue<int>(), Is.EqualTo(2));
        Assert.That(updated["recipeHash"]!.GetValue<string>(), Is.EqualTo(created["recipeHash"]!.GetValue<string>()));
        Assert.That(updated["contentHash"]!.GetValue<string>(), Is.Not.EqualTo(created["contentHash"]!.GetValue<string>()));
        body.Remove("publisherStarred"); body.Remove("publisherRunCount"); body["revision"] = 2;
        var legacy = Result(await service.Put(new UpdatePublishedDecision { ExternalRef = reference, RequestStream = Stream(body) }));
        Assert.That(legacy["revision"]!.GetValue<int>(), Is.EqualTo(2));
        Assert.That(legacy["publisherStarred"]!.GetValue<bool>(), Is.True);
        Assert.That(legacy["publisherRunCount"]!.GetValue<int>(), Is.EqualTo(12));
    }
    [Test]
    public async Task Discovery_sorts_usage_with_stable_pagination_and_filters()
    {
        var service = Service("ranking");
        foreach (var (starred, runs, name) in new[] { (false, 100, "Often run"), (true, 3, "Starred"), (true, 20, "Starred often"), (true, 20, "Tie") })
        {
            var body = Body(); body["document"]!["name"] = name; body["publisherStarred"] = starred; body["publisherRunCount"] = runs;
            // A changed name does not affect execution question keys.
            await service.Post(new PublishDecision { RequestStream = Stream(body) });
        }
        using (var db = factory.Open()) db.UpdateOnly(() => new PublishedDecision { UpdatedAt = new DateTime(2026, 1, 1) }, x => x.PublishedBy == "ranking");
        var first = Result(await service.Get(new QueryPublishedDecisions { OrderBy = "recommended", Take = 2 }));
        Assert.That(first["items"]![0]!["name"]!.GetValue<string>(), Is.EqualTo("Tie"));
        Assert.That(first["items"]![1]!["name"]!.GetValue<string>(), Is.EqualTo("Starred often"));
        Assert.That(first["hasMore"]!.GetValue<bool>(), Is.True);
        var next = Result(await service.Get(new QueryPublishedDecisions { OrderBy = "recommended", Skip = 2 }));
        Assert.That(next["items"]![0]!["name"]!.GetValue<string>(), Is.EqualTo("Starred"));
        var most = Result(await service.Get(new QueryPublishedDecisions { OrderBy = "most-run" }));
        Assert.That(most["items"]![0]!["publisherRunCount"]!.GetValue<int>(), Is.EqualTo(100));
        Assert.That(Result(await service.Get(new QueryPublishedDecisions { OrderBy = "recommended", Tag = "nonexistent" }))["items"]!.AsArray(), Is.Empty);
    }
    [Test]
    public void Tag_catalog_is_public_versioned_and_cacheable()
    {
        var response = (HttpResult)Service("anonymous").Get(new GetDecisionTags());
        var catalog = Result(response);
        Assert.That(catalog["version"]!.GetValue<int>(), Is.EqualTo(3));
        var tags = catalog["tags"]!.AsArray();
        Assert.That(tags.Count, Is.EqualTo(12));
        Assert.That(tags.All(tag => !tag!.AsObject().ContainsKey("name")), Is.True);
        Assert.That(tags.Select(x => x!["label"]!.GetValue<string>()).Distinct().Count(), Is.EqualTo(12));
        Assert.That(response.Headers["Cache-Control"], Does.Contain("max-age"));
        Assert.That(response.Headers["ETag"], Does.StartWith("\"decision-tags-"));
        TagOptions.Tags.Add(new DecisionTagDefinition { Label = "Custom domain", Group = "context" });
        var changed = (HttpResult)Service("anonymous").Get(new GetDecisionTags());
        Assert.That(Result(changed)["tags"]!.AsArray().Last()!["label"]!.GetValue<string>(), Is.EqualTo("Custom domain"));
        Assert.That(changed.Headers["ETag"], Is.Not.EqualTo(response.Headers["ETag"]));
    }
    [TestCase(false)]
    [TestCase(true)]
    public async Task Untagged_publications_are_inferred_once_and_preserve_portable_snapshot(bool emptyArray)
    {
        var service = Service("auto-tags"); var body = Body();
        if (emptyArray) body["document"]!["tags"] = new JsonArray(); else body["document"]!.AsObject().Remove("tags");
        var expected = DecisionPublishServices.Snapshot(body);
        var created = Result(await service.Post(new PublishDecision { RequestStream = Stream(body) }));
        var reference = created["externalRef"]!.GetValue<string>();
        Assert.That(created["tags"]!.AsArray().Select(x => x!.GetValue<string>()), Is.EqualTo(new[] { "Verification" }));
        Assert.That(created["content"]!.GetValue<string>(), Is.EqualTo("Content"));
        Assert.That(created["recipeHash"]!.GetValue<string>(), Is.EqualTo(expected.RecipeHash));
        Assert.That(created["contentHash"]!.GetValue<string>(), Is.EqualTo(expected.ContentHash));
        await service.Post(new PublishDecision { RequestStream = Stream(body) });
        Assert.That(tagger.Calls, Is.EqualTo(1), "Recovered creation does not incur another provider call");
        var detail = Result(await service.Get(new GetPublishedDecision { ExternalRef = reference }));
        Assert.That(JsonNode.DeepEquals(detail["document"], body["document"]), Is.True);
        body["revision"] = 1; body["publisherRunCount"] = 20;
        var updated = Result(await service.Put(new UpdatePublishedDecision { ExternalRef = reference, RequestStream = Stream(body) }));
        Assert.That(tagger.Calls, Is.EqualTo(1), "Usage-only updates retain inferred tags");
        Assert.That(JsonNode.DeepEquals(updated["tags"], created["tags"]), Is.True);
        body["revision"] = 2; body["document"]!["description"] = "Changed purpose";
        await service.Put(new UpdatePublishedDecision { ExternalRef = reference, RequestStream = Stream(body) });
        Assert.That(tagger.Calls, Is.EqualTo(2), "Changed untagged recipe is evaluated again");
        body["revision"] = 3; body["document"]!["tags"] = new JsonArray("user-custom");
        updated = Result(await service.Put(new UpdatePublishedDecision { ExternalRef = reference, RequestStream = Stream(body) }));
        Assert.That(tagger.Calls, Is.EqualTo(2));
        Assert.That(updated["tags"]![0]!.GetValue<string>(), Is.EqualTo("user-custom"));
    }
    [Test]
    public async Task Labels_drive_discovery_and_filter_older_slug_values_without_changing_documents()
    {
        TagOptions.Tags.Add(new DecisionTagDefinition { Label = "Risk analysis" });
        var service = Service("label-values"); var body = Body();
        body["document"]!["content"] = "email";
        body["document"]!["tags"] = new JsonArray("risk-analysis", "sentiment", "Author Tag");
        var expected = DecisionPublishServices.Snapshot(body);
        var created = Result(await service.Post(new PublishDecision { RequestStream = Stream(body) }));
        Assert.That(created["content"]!.GetValue<string>(), Is.EqualTo("Email"));
        Assert.That(created["tags"]!.AsArray().Select(x => x!.GetValue<string>()), Is.EqualTo(new[] { "Risk analysis", "Sentiment", "Author Tag" }));
        Assert.That(created["recipeHash"]!.GetValue<string>(), Is.EqualTo(expected.RecipeHash));
        var detail = Result(await service.Get(new GetPublishedDecision { ExternalRef = created["externalRef"]!.GetValue<string>() }));
        Assert.That(JsonNode.DeepEquals(detail["document"], body["document"]), Is.True);
        foreach (var filter in new[] { "Risk analysis", "risk-analysis", "RISK ANALYSIS", "Email", "email", "Author Tag" })
            Assert.That(Result(await service.Get(new QueryPublishedDecisions { Tag = filter }))["items"]!.AsArray().Count, Is.EqualTo(1), filter);
        body["idempotencyKey"] = "labels_new_value_123";
        body["document"]!["content"] = "Email";
        body["document"]!["tags"] = new JsonArray("Risk analysis");
        await service.Post(new PublishDecision { RequestStream = Stream(body) });
        Assert.That(Result(await service.Get(new QueryPublishedDecisions { Tag = "Risk analysis" }))["items"]!.AsArray().Count, Is.EqualTo(2));
        Assert.That(tagger.Calls, Is.Zero);
    }
    [Test]
    public async Task Explicit_content_and_three_custom_tags_survive_discovery_and_download()
    {
        var service = Service("content-fields"); var body = Body();
        body["document"]!["content"] = "policy-document";
        body["document"]!["tags"] = new JsonArray("compliance", "routing", "custom-tag");
        var created = Result(await service.Post(new PublishDecision { RequestStream = Stream(body) }));
        Assert.That(created["content"]!.GetValue<string>(), Is.EqualTo("policy-document"));
        Assert.That(created["tags"]!.AsArray().Count, Is.EqualTo(3));
        Assert.That(tagger.Calls, Is.Zero);
        var reference = created["externalRef"]!.GetValue<string>();
        var detail = Result(await service.Get(new GetPublishedDecision { ExternalRef = reference }));
        Assert.That(JsonNode.DeepEquals(detail["document"], body["document"]), Is.True);
        var catalog = Result(await service.Get(new QueryPublishedDecisions { Tag = "policy-document" }));
        Assert.That(catalog["items"]!.AsArray().Count, Is.EqualTo(1));
    }
    [Test]
    public async Task Supplied_content_is_kept_when_missing_tags_are_inferred_or_retried()
    {
        var service = Service("content-inference"); var body = Body();
        body["document"]!["content"] = "email";
        body["document"]!["tags"] = new JsonArray();
        tagger.Result = [];
        var created = Result(await service.Post(new PublishDecision { RequestStream = Stream(body) }));
        Assert.That(created["content"]!.GetValue<string>(), Is.EqualTo("Email"));
        Assert.That(created["tags"]!.AsArray(), Is.Empty);
        tagger.Result = ["news", "sentiment", "verification", "routing"];
        body["revision"] = 1; body["publisherRunCount"] = 2;
        var updated = Result(await service.Put(new UpdatePublishedDecision { ExternalRef = created["externalRef"]!.GetValue<string>(), RequestStream = Stream(body) }));
        Assert.That(tagger.Calls, Is.EqualTo(2));
        Assert.That(updated["content"]!.GetValue<string>(), Is.EqualTo("Email"));
        Assert.That(updated["tags"]!.AsArray().Select(x => x!.GetValue<string>()), Is.EqualTo(new[] { "Sentiment", "Verification", "Routing" }));
    }
    [Test]
    public async Task Failed_inference_does_not_block_publication_and_a_later_update_can_try_again()
    {
        var service = Service("tag-fallback"); var body = Body(); body["document"]!["tags"] = new JsonArray();
        tagger.Result = [];
        var created = Result(await service.Post(new PublishDecision { RequestStream = Stream(body) }));
        Assert.That(created["tags"]!.AsArray(), Is.Empty);
        tagger.Result = ["content", "verification"];
        body["revision"] = 1; body["publisherRunCount"] = 1;
        var updated = Result(await service.Put(new UpdatePublishedDecision { ExternalRef = created["externalRef"]!.GetValue<string>(), RequestStream = Stream(body) }));
        Assert.That(tagger.Calls, Is.EqualTo(2));
        Assert.That(updated["tags"]!.AsArray().Count, Is.EqualTo(1));
    }
    [Test]
    public async Task Supplied_tags_bypass_inference()
    {
        var body = Body(); body["document"]!["tags"] = new JsonArray("my-custom-tag");
        var created = Result(await Service("authored-tags").Post(new PublishDecision { RequestStream = Stream(body) }));
        Assert.That(tagger.Calls, Is.Zero);
        Assert.That(created["tags"]![0]!.GetValue<string>(), Is.EqualTo("my-custom-tag"));
    }
    [Test]
    public void Migration_defaults_preserve_existing_publications()
    {
        using var db = new OrmLiteConnectionFactory(":memory:", SqliteDialect.Provider).Open();
        db.CreateTable<MyApp.Migrations.Migration1010.PublishedDecision>();
        db.Insert(new MyApp.Migrations.Migration1010.PublishedDecision { ExternalRef = "existing", CreateIdempotencyKey = "existing" });
        db.AddColumn<MyApp.Migrations.Migration1011.PublishedDecision>(x => x.PublisherStarred);
        db.AddColumn<MyApp.Migrations.Migration1011.PublishedDecision>(x => x.PublisherRunCount);
        var row = db.Single<PublishedDecision>(x => x.ExternalRef == "existing");
        Assert.That(row.PublisherStarred, Is.False); Assert.That(row.PublisherRunCount, Is.Zero);
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
        db.AddColumn<MyApp.Migrations.Migration1011.PublishedDecision>(x => x.PublisherStarred);
        db.AddColumn<MyApp.Migrations.Migration1011.PublishedDecision>(x => x.PublisherRunCount);
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
