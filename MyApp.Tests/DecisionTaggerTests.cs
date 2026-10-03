#nullable enable
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using MyApp.ServiceInterface;
using NUnit.Framework;

namespace MyApp.Tests;

[TestFixture]
public class DecisionTaggerTests
{
    static DecisionPublishingOptions Options() => new() { Tags = [
        new() { Name = "topic-a", Label = "Topic A", Group = "context", Description = "The recipe evaluates A." },
        new() { Name = "topic-b", Group = "context" },
        new() { Name = "task-c" }, new() { Name = "task-d" }, new() { Name = "task-e" }
    ] };
    static JsonObject Answers(params double[] scores) => new() { ["answers"] = new JsonObject(
        scores.Select((score, i) => new KeyValuePair<string, JsonNode?>("tag_" + i,
            new JsonObject { ["type"] = "noul", ["noul"] = JsonValue.Create(score) }))) };
    sealed class Handler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> send) : HttpMessageHandler
    {
        public int Calls;
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
        { Calls++; return send(request, token); }
    }
    static HttpResponseMessage Response(JsonObject result) => new(HttpStatusCode.OK) {
        Content = new StringContent(result.ToJsonString(), Encoding.UTF8, "application/json")
    };
    static JevDecisionTagger Tagger(HttpClient http, DecisionPublishingOptions options, string? key = "fixture-secret") =>
        new(http, options, key, NullLogger<JevDecisionTagger>.Instance);

    [Test]
    public async Task Raw_request_uses_decisions_endpoint_server_key_and_one_noul_per_configured_tag()
    {
        var options = Options(); var recipe = new JsonObject { ["name"] = "Test recipe", ["questions"] = new JsonObject() };
        var original = recipe.ToJsonString();
        using var handler = new Handler(async (request, token) => {
            Assert.That(request.Method, Is.EqualTo(HttpMethod.Post));
            Assert.That(request.RequestUri!.AbsoluteUri, Is.EqualTo(JevDecisionTagger.Endpoint));
            Assert.That(request.Headers.Authorization!.Scheme, Is.EqualTo("Bearer"));
            Assert.That(request.Headers.Authorization.Parameter, Is.EqualTo("fixture-secret"));
            Assert.That(request.Content!.Headers.ContentType!.MediaType, Is.EqualTo("application/json"));
            var body = JsonNode.Parse(await request.Content.ReadAsStringAsync(token))!.AsObject();
            Assert.That(body["model"]!.GetValue<string>(), Is.EqualTo(options.TaggingModel));
            Assert.That(JsonNode.DeepEquals(body["state"]!["recipe"], recipe), Is.True);
            Assert.That(body["questions"]!.AsObject().Count, Is.EqualTo(options.Tags.Count));
            Assert.That(body["questions"]!["tag_0"]!["type"]!.GetValue<string>(), Is.EqualTo("noul"));
            Assert.That(body["questions"]!["tag_0"]!["criteria"]!["true"]!.GetValue<string>(), Is.EqualTo(options.Tags[0].Description));
            Assert.That(body.ContainsKey("messages"), Is.False);
            Assert.That(body.ToJsonString(), Does.Not.Contain("fixture-secret"));
            return Response(Answers(.51, .99, .8, .95, .5));
        });
        using var http = new HttpClient(handler);
        Assert.That(await Tagger(http, options).InferTags(recipe), Is.EqualTo(new[] { "topic-b", "task-d", "task-c" }));
        Assert.That(recipe.ToJsonString(), Is.EqualTo(original)); Assert.That(handler.Calls, Is.EqualTo(1));
    }
    [Test]
    public void Selection_uses_strict_threshold_top_three_and_configured_tie_order()
    {
        var options = Options();
        Assert.That(JevDecisionTagger.SelectTags(Answers(.5, .49, 0, 1, .50001), options), Is.EqualTo(new[] { "task-d", "task-e" }));
        Assert.That(JevDecisionTagger.SelectTags(Answers(.9, .9, .9, .9, .9), options), Is.EqualTo(new[] { "topic-a", "topic-b", "task-c" }));
        Assert.That(JevDecisionTagger.SelectTags(Answers(.5, .2, 0, .49, .5), options), Is.Empty);
    }
    [TestCase("-0.1")]
    [TestCase("1.1")]
    [TestCase("null")]
    [TestCase("\"0.9\"")]
    public async Task Invalid_probabilities_leave_publication_untagged(string value)
    {
        var result = Answers(.9, .8, .7, .6, .5); result["answers"]!["tag_0"]!["noul"] = JsonNode.Parse(value);
        using var handler = new Handler((_, _) => Task.FromResult(Response(result)));
        using var http = new HttpClient(handler);
        Assert.That(await Tagger(http, Options()).InferTags(new JsonObject()), Is.Empty);
        Assert.That(handler.Calls, Is.EqualTo(1));
    }
    [Test]
    public void Missing_extra_or_wrong_type_answers_are_rejected()
    {
        var options = Options(); var missing = Answers(.9, .8, .7, .6);
        Assert.Throws<JsonException>(() => JevDecisionTagger.SelectTags(missing, options));
        var extra = Answers(.9, .8, .7, .6, .5, .99);
        Assert.Throws<JsonException>(() => JevDecisionTagger.SelectTags(extra, options));
        var wrong = Answers(.9, .8, .7, .6, .5); wrong["answers"]!["tag_0"]!["type"] = "choice";
        Assert.Throws<JsonException>(() => JevDecisionTagger.SelectTags(wrong, options));
        wrong = Answers(.9, .8, .7, .6, .5); var answer = wrong["answers"]!["tag_0"]!.DeepClone();
        wrong["answers"]!.AsObject().Remove("tag_0"); wrong["answers"]!["unknown"] = answer;
        Assert.Throws<JsonException>(() => JevDecisionTagger.SelectTags(wrong, options));
    }
    [TestCase(401)]
    [TestCase(429)]
    [TestCase(500)]
    [TestCase(302)]
    public async Task Provider_failure_has_no_retry_and_no_tags(int status)
    {
        using var handler = new Handler((_, _) => Task.FromResult(new HttpResponseMessage((HttpStatusCode)status)));
        using var http = new HttpClient(handler);
        Assert.That(await Tagger(http, Options()).InferTags(new JsonObject()), Is.Empty);
        Assert.That(handler.Calls, Is.EqualTo(1));
    }
    [TestCase(false)]
    [TestCase(true)]
    public async Task Malformed_or_oversized_response_is_bounded(bool oversized)
    {
        using var handler = new Handler((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) {
            Content = new StringContent(oversized ? new string('x', 2 * 1024 * 1024 + 1) : "not JSON")
        }));
        using var http = new HttpClient(handler);
        Assert.That(await Tagger(http, Options()).InferTags(new JsonObject()), Is.Empty);
    }
    [Test]
    public async Task Missing_key_disabled_tagging_and_empty_catalogue_make_no_http_request()
    {
        using var handler = new Handler((_, _) => throw new AssertionException("HTTP must not be called"));
        using var http = new HttpClient(handler); var options = Options();
        Assert.That(await Tagger(http, options, null).InferTags(new JsonObject()), Is.Empty);
        options.AutoTagUntaggedRecipes = false;
        Assert.That(await Tagger(http, options).InferTags(new JsonObject()), Is.Empty);
        options.AutoTagUntaggedRecipes = true; options.Tags.Clear();
        Assert.That(await Tagger(http, options).InferTags(new JsonObject()), Is.Empty);
        Assert.That(handler.Calls, Is.Zero);
    }
    [Test]
    public async Task Timeout_cancels_request_and_does_not_retry()
    {
        using var handler = new Handler(async (_, token) => {
            await Task.Delay(Timeout.Infinite, token); return new HttpResponseMessage(HttpStatusCode.OK);
        });
        using var http = new HttpClient(handler); var options = Options(); options.TaggingTimeoutSeconds = 1;
        Assert.That(await Tagger(http, options).InferTags(new JsonObject()), Is.Empty);
        Assert.That(handler.Calls, Is.EqualTo(1));
    }
    [Test]
    public void Appsettings_can_define_custom_candidates_and_invalid_catalogues_fail_early()
    {
        var config = new ConfigurationBuilder().AddJsonStream(new MemoryStream(Encoding.UTF8.GetBytes("""
            { "DecisionPublishing": { "Tags": [{ "Name": "my-domain", "Description": "Core purpose concerns my domain." }] } }
            """))).Build();
        var options = config.GetSection("DecisionPublishing").Get<DecisionPublishingOptions>()!;
        Assert.DoesNotThrow(options.Validate);
        Assert.That(options.Catalog().Tags.Single().Name, Is.EqualTo("my-domain"));
        Assert.That(options.Catalog().Tags.Single().Label, Is.EqualTo("my-domain"));
        Assert.That(JevDecisionTagger.RequestBody(new JsonObject(), options)["questions"]!["tag_0"]!["criteria"]!["true"]!.GetValue<string>(), Is.EqualTo(options.Tags[0].Description));
        options.Tags.Add(new DecisionTagDefinition { Name = "my-domain" });
        Assert.Throws<InvalidOperationException>(options.Validate);
        options.Tags = [new() { Name = "BAD tag" }]; Assert.Throws<InvalidOperationException>(options.Validate);
        options.Tags = []; options.TaggingTimeoutSeconds = 30; Assert.Throws<InvalidOperationException>(options.Validate);
    }
}
