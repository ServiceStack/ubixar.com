using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Security.Cryptography;
using System.Collections.Concurrent;
using ServiceStack;
using ServiceStack.OrmLite;
using ServiceStack.Text;
using JsonValue = System.Text.Json.Nodes.JsonValue;
using JsonObject = System.Text.Json.Nodes.JsonObject;
using JsonSerializer = System.Text.Json.JsonSerializer;
using MyApp.ServiceModel;

namespace MyApp.ServiceInterface;

public class DecisionPublishServices : Service
{
    public DecisionPublishingOptions TagOptions { get; }
    public IDecisionTagger Tagger { get; }
    public DecisionPublishServices(DecisionPublishingOptions tagOptions, IDecisionTagger tagger)
    {
        TagOptions = tagOptions; Tagger = tagger;
    }

    static readonly ConcurrentDictionary<string, (long Minute, int Count)> Rates = new();
    static void Rate(string key, int max)
    {
        var minute = DateTimeOffset.UtcNow.ToUnixTimeSeconds() / 60;
        if (Rates.Count > 10000) foreach (var pair in Rates) if (pair.Value.Minute < minute - 1) Rates.TryRemove(pair.Key, out _);
        var value = Rates.AddOrUpdate(key, (minute, 1), (_, old) => old.Minute == minute ? (minute, old.Count + 1) : (minute, 1));
        if (value.Count > max) throw new HttpError(429, "RateLimit", "Too many requests. Try again shortly.");
    }
    static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();
    static HttpError Conflict(string message) => new(409, "Conflict", message);
    static string Reference(string value) => System.Text.RegularExpressions.Regex.IsMatch(value, @"^[A-Za-z0-9_-]{1,100}$") ? value : throw HttpError.NotFound("Recipe unavailable.");
    static async Task<JsonObject> Read(Stream stream)
    {
        using var memory = new MemoryStream(); var buffer = new byte[65536]; int read;
        while ((read = await stream.ReadAsync(buffer)) > 0)
        {
            if (memory.Length + read > DecisionDocumentValidator.EnvelopeLimit) throw new HttpError(413, "TooLarge", "Publication must fit within 3 MiB.");
            await memory.WriteAsync(buffer.AsMemory(0, read));
        }
        try { return DecisionDocumentValidator.Parse(new UTF8Encoding(false, true).GetString(memory.ToArray()), DecisionDocumentValidator.EnvelopeLimit); }
        catch (DecoderFallbackException) { throw new HttpError(400, "ValidationError", "Provide valid UTF-8 JSON."); }
    }
    static string String(JsonObject body, string field) => body[field] is JsonValue value && value.TryGetValue<string>(out var text)
        ? text : throw new HttpError(400, "ValidationError", field + ": Provide text.");
    public static PublishedDecision Snapshot(JsonObject body)
    {
        var filename = String(body, "filename");
        DecisionDocumentValidator.Filename(filename);
        var doc = body["document"]; DecisionDocumentValidator.Document(doc);
        var execution = body["execution"]; DecisionDocumentValidator.Execution(doc!, execution);
        var payload = new JsonObject { ["filename"] = filename, ["document"] = doc!.DeepClone(), ["execution"] = execution!.DeepClone() };
        var starred = false; var runs = 0;
        if (body.ContainsKey("publisherStarred"))
        {
            if (body["publisherStarred"] is not JsonValue star || !star.TryGetValue<bool>(out starred))
                throw new HttpError(400, "ValidationError", "publisherStarred: Provide true or false.");
            payload["publisherStarred"] = starred;
        }
        if (body.ContainsKey("publisherRunCount"))
        {
            if (body["publisherRunCount"] is not JsonValue count || !count.TryGetValue<int>(out runs) || runs < 0)
                throw new HttpError(400, "ValidationError", "publisherRunCount: Provide a non-negative integer.");
            payload["publisherRunCount"] = runs;
        }
        var documentJson = DecisionDocumentValidator.Serialize(doc);
        var content = doc["content"]?.GetValue<string>();
        var metadata = (doc["tags"] as JsonArray ?? []).Select(t => t!.GetValue<string>()).ToList();
        if (!string.IsNullOrEmpty(content)) metadata.Insert(0, content);
        return new PublishedDecision
        {
            PublisherStarred = starred,
            PublisherRunCount = runs,
            Filename = filename,
            SchemaVersion = 1,
            DocumentJson = documentJson,
            RecipeHash = Hash(documentJson),
            ExecutionJson = DecisionDocumentValidator.Serialize(execution),
            ContentHash = Hash(DecisionDocumentValidator.Serialize(payload)),
            Name = doc["name"]!.GetValue<string>(),
            Description = doc["description"]?.GetValue<string>() ?? "",
            Tags = JsonSerializer.Serialize(metadata.Distinct().ToList(), DecisionDocumentValidator.JsonOptions),
            QuestionCount = doc["questions"]!.AsObject().Count,
            FieldCount = (doc["inputSchema"]!["properties"] as JsonObject)?.Count ?? 0,
            ExampleCount = (doc["examples"] as JsonArray)?.Count ?? 0,
            ExecutedModel = execution["model"]!.GetValue<string>(),
            ExecutedAt = DateTimeOffset.Parse(execution["completedAt"]!.GetValue<string>()).UtcDateTime
        };
    }
    async Task<PublishedDecision> Find(string reference, bool active = true)
    {
        Reference(reference);
        var row = await Db.SingleAsync<PublishedDecision>(x => x.ExternalRef == reference);
        if (row == null || active && row.UnpublishedAt != null) throw HttpError.NotFound("Recipe unavailable.");
        return row;
    }
    async Task<DecisionPublication> Projection(PublishedDecision row, bool detail)
    {
        var user = await Db.SingleByIdAsync<User>(row.PublishedBy);
        var url = Request.ResolveAbsoluteUrl("~/d/" + row.ExternalRef);
        var discoveryTags = (JsonSerializer.Deserialize<List<string>>(row.Tags) ?? []).Select(TagOptions.CanonicalLabel).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var document = JsonNode.Parse(row.DocumentJson)!.AsObject();
        var content = TagOptions.CanonicalLabel(document["content"]?.GetValue<string>() ?? "");
        var legacy = !document.ContainsKey("content");
        if (string.IsNullOrEmpty(content) && (legacy || (document["tags"] as JsonArray)?.Count is null or 0))
            content = discoveryTags.FirstOrDefault(TagOptions.IsContentLabel);

        return new DecisionPublication
        {
            PublisherStarred = row.PublisherStarred,
            PublisherRunCount = row.PublisherRunCount,
            ExternalRef = row.ExternalRef,
            PublishedUrl = url,
            DownloadUrl = url + "/recipe.json",
            Filename = row.Filename,
            Revision = row.Revision,
            ContentHash = row.ContentHash,
            RecipeHash = row.RecipeHash,
            PublishedAt = row.PublishedAt,
            UpdatedAt = row.UpdatedAt,
            Author = new DecisionAuthor { UserName = user?.UserName ?? "", DisplayName = user?.UserName ?? "" },
            Name = row.Name,
            Description = row.Description,
            Content = content ?? "",
            Tags = discoveryTags.Where(tag => tag != content && (!legacy || !TagOptions.IsContentLabel(tag))).ToList(),
            SchemaVersion = row.SchemaVersion,
            QuestionCount = row.QuestionCount,
            FieldCount = row.FieldCount,
            ExampleCount = row.ExampleCount,
            ExecutedModel = row.ExecutedModel,
            ExecutedAt = row.ExecutedAt,
            Document = detail ? JsonDocument.Parse(row.DocumentJson).RootElement.Clone() : null,
            Execution = detail ? JsonDocument.Parse(row.ExecutionJson).RootElement.Clone() : null
        };
    }
    object Json(object value, string? etag = null)
    {
        var content = JsonSerializer.Serialize(value, DecisionDocumentValidator.JsonOptions);
        if (Encoding.UTF8.GetByteCount(content) > DecisionDocumentValidator.EnvelopeLimit) throw new HttpError(413, "TooLarge", "Publication detail exceeds size limit.");
        var result = new HttpResult(content, "application/json"); result.Headers["Cache-Control"] = "no-cache, must-revalidate";
        if (etag != null) result.Headers["ETag"] = '"' + etag + '"';
        return result;
    }
    public async Task<object> Post(PublishDecision request)
    {
        var owner = Request.GetRequiredUserId(); Rate("publish:" + owner, 20);
        var body = await Read(request.RequestStream);
        var row = Snapshot(body);
        var key = String(body, "idempotencyKey");
        if (!System.Text.RegularExpressions.Regex.IsMatch(key, @"^[A-Za-z0-9_-]{16,100}$")) throw new HttpError(400, "ValidationError", "Provide an idempotency key.");
        var old = await Db.SingleAsync<PublishedDecision>(x => x.PublishedBy == owner && x.CreateIdempotencyKey == key);
        if (old != null) return await CreationReceipt(old, row.ContentHash);
        if (await Db.CountAsync<PublishedDecision>(x => x.PublishedBy == owner) >= 1000) throw new HttpError(429, "Quota", "Publisher storage quota reached.");
        row.PublishedBy = owner; row.ExternalRef = PreciseTimestamp.UniqueTimestamp.EncodeBase64Url();
        row.CreateIdempotencyKey = key; row.CreateRequestHash = row.ContentHash; row.Revision = 1; row.PublishedAt = row.UpdatedAt = DateTime.UtcNow;
        await AssignTags(row);
        // Ensure detail projection fits before committing the publication.
        Json(await Projection(row, true));
        try { row.Id = await Db.InsertAsync(row, selectIdentity: true); }
        catch
        {
            old = await Db.SingleAsync<PublishedDecision>(x => x.PublishedBy == owner && x.CreateIdempotencyKey == key);
            if (old == null) throw;
            return await CreationReceipt(old, row.ContentHash);
        }
        return Json(await Projection(row, false));
    }
    async Task<object> CreationReceipt(PublishedDecision old, string hash)
    {
        if (old.CreateRequestHash != hash) throw Conflict("This idempotency key belongs to different content.");
        if (old.UnpublishedAt != null) throw Conflict("This publication was removed. Start a new share to get a new reference.");
        return Json(await Projection(old, false));
    }
    public async Task<object> Put(UpdatePublishedDecision request)
    {
        var owner = Request.GetRequiredUserId(); Rate("publish:" + owner, 20);
        var body = await Read(request.RequestStream);
        var old = await Find(request.ExternalRef);
        if (old.PublishedBy != owner) throw HttpError.Forbidden("Only the publisher can update this recipe.");
        var revision = body["revision"] is JsonValue revisionValue && revisionValue.TryGetValue<int>(out var parsedRevision)
            ? parsedRevision : throw new HttpError(400, "ValidationError", "revision: Provide an integer public revision.");
        if (revision != old.Revision) throw Conflict("The public recipe changed. Review it before updating.");
        // Legacy clients omit usage. Preserve previously published signals.
        if (old.PublisherStarred || old.PublisherRunCount > 0 || body.ContainsKey("publisherStarred") || body.ContainsKey("publisherRunCount"))
        {
            if (!body.ContainsKey("publisherStarred")) body["publisherStarred"] = old.PublisherStarred;
            if (!body.ContainsKey("publisherRunCount")) body["publisherRunCount"] = old.PublisherRunCount;
        }
        var row = Snapshot(body);
        if (old.ContentHash == row.ContentHash) return Json(await Projection(old, false));
        row.Id = old.Id; row.ExternalRef = old.ExternalRef; row.PublishedBy = owner;
        row.CreateIdempotencyKey = old.CreateIdempotencyKey; row.CreateRequestHash = old.CreateRequestHash;
        row.PublishedAt = old.PublishedAt; row.UpdatedAt = DateTime.UtcNow; row.Revision = revision + 1;
        await AssignTags(row, old);
        Json(await Projection(row, true));
        var count = await Db.UpdateOnlyFieldsAsync(row, x => new
        {
            x.PublisherStarred,
            x.PublisherRunCount,
            x.Filename,
            x.SchemaVersion,
            x.DocumentJson,
            x.RecipeHash,
            x.ExecutionJson,
            x.ContentHash,
            x.Name,
            x.Description,
            x.Tags,
            x.QuestionCount,
            x.FieldCount,
            x.ExampleCount,
            x.ExecutedModel,
            x.ExecutedAt,
            x.Revision,
            x.UpdatedAt
        },
            x => x.Id == old.Id && x.Revision == revision && x.UnpublishedAt == null);
        if (count != 1) throw Conflict("The public recipe changed. Review it before updating.");
        return Json(await Projection(row, false));
    }
    public async Task<object> Delete(UnpublishDecision request) => await Revoke(request.ExternalRef, request.Revision);
    public async Task<object> Delete(UnpublishMyDecision request)
    {
        // Cookie-authenticated mutations require an explicit same-origin browser request.
        var origin = Request.Headers["Origin"];
        var expected = new Uri(Request.ResolveAbsoluteUrl("~/")).GetLeftPart(UriPartial.Authority);
        if (origin != expected || Request.Headers["X-Recipe-Management"] != "1") throw HttpError.Forbidden("Use the recipe management page to stop sharing.");
        return await Revoke(request.ExternalRef, request.Revision);
    }
    async Task<object> Revoke(string reference, int revision)
    {
        var owner = Request.GetRequiredUserId(); Rate("publish:" + owner, 20);
        var old = await Find(reference, false);
        if (old.PublishedBy != owner) throw HttpError.Forbidden("Only the publisher can stop sharing.");
        if (old.Revision != revision) throw Conflict("The public recipe changed. Refresh before removing it.");
        if (old.UnpublishedAt == null && await Db.UpdateOnlyAsync(() => new PublishedDecision { UnpublishedAt = DateTime.UtcNow }, x => x.Id == old.Id && x.Revision == revision && x.UnpublishedAt == null) != 1)
            throw Conflict("The public recipe changed. Refresh before removing it.");
        return Json(new EmptyResponse());
    }
    public async Task<object> Get(GetPublishedDecision request)
    {
        Rate("query:" + Request.UserHostAddress, 120); var row = await Find(request.ExternalRef);
        return Json(await Projection(row, true), row.Revision + "-" + row.ContentHash);
    }
    public async Task<object> Get(QueryPublishedDecisions request) => await Catalog(request, null);
    public async Task<object> Get(MyPublishedDecisions request) => await Catalog(request, Request.GetRequiredUserId());
    async Task<object> Catalog(DecisionCatalogQuery request, string? owner)
    {
        Rate("query:" + Request.UserHostAddress, 120);
        var q = Db.From<PublishedDecision>().Where(x => x.UnpublishedAt == null);
        if (owner != null) q.And(x => x.PublishedBy == owner);
        if (!string.IsNullOrEmpty(request.User)) { var user = await Db.SingleAsync<User>(x => x.UserName == request.User); var id = user?.Id ?? "missing"; q.And(x => x.PublishedBy == id); }
        if (!string.IsNullOrEmpty(request.Q)) { var search = request.Q.Trim(); if (search.Length > 200) throw new HttpError(400, "ValidationError", "Search must fit in 200 characters."); q.And(x => x.Name.Contains(search) || x.Description.Contains(search)); }
        if (!string.IsNullOrWhiteSpace(request.Tag)) {
            var label = TagOptions.CanonicalLabel(request.Tag.Trim());
            var tag = JsonSerializer.Serialize(label, DecisionDocumentValidator.JsonOptions);
            var lower = tag.ToLowerInvariant();
            var legacy = JsonSerializer.Serialize(DecisionPublishingOptions.TagKey(label), DecisionDocumentValidator.JsonOptions);
            q.And(x => x.Tags.Contains(tag) || x.Tags.ToLower().Contains(lower) || x.Tags.ToLower().Contains(legacy));
        }
        if (request.OrderBy == "name") q.OrderBy(x => x.Name).ThenBy(x => x.Id);
        else if (request.OrderBy == "recommended") q.OrderByDescending(x => x.PublisherStarred).ThenByDescending(x => x.PublisherRunCount).ThenByDescending(x => x.UpdatedAt).ThenByDescending(x => x.Id);
        else if (request.OrderBy == "most-run") q.OrderByDescending(x => x.PublisherRunCount).ThenByDescending(x => x.PublisherStarred).ThenByDescending(x => x.UpdatedAt).ThenByDescending(x => x.Id);
        else if (request.OrderBy is null or "newest" or "-updatedAt") q.OrderByDescending(x => x.UpdatedAt).ThenByDescending(x => x.Id);
        else throw new HttpError(400, "ValidationError", "Order by recommended, most-run, newest or name.");
        var skip = Math.Clamp(request.Skip, 0, 10000); var take = Math.Clamp(request.Take, 1, 50); q.Limit(skip, take + 1);
        var rows = await Db.SelectAsync(q); var result = new DecisionCatalog { Skip = skip, Take = take, HasMore = rows.Count > take };
        foreach (var row in rows.Take(take)) result.Items.Add(await Projection(row, false));
        return Json(result);
    }
    async Task AssignTags(PublishedDecision row, PublishedDecision? previous = null)
    {
        var document = JsonNode.Parse(row.DocumentJson)!.AsObject();
        if ((document["tags"] as JsonArray)?.Count > 0) return;
        var suppliedContent = TagOptions.CanonicalLabel(document["content"]?.GetValue<string>() ?? "");
        // Usage-only updates retain successful inferred tags without another paid request.
        // A content value alone must not prevent retrying a previously empty tag result.
        if (previous?.RecipeHash == row.RecipeHash && JsonNode.Parse(previous.Tags)!.AsArray()
            .Any(tag => TagOptions.CanonicalLabel(tag!.GetValue<string>()) != suppliedContent && !TagOptions.IsContentLabel(tag.GetValue<string>())))
        { row.Tags = previous.Tags; return; }
        var inferred = (await Tagger.InferTags(document)).Select(TagOptions.CanonicalLabel).ToList();
        var tags = string.IsNullOrEmpty(suppliedContent) ? inferred : new[] { suppliedContent }.Concat(
            inferred.Where(name => !TagOptions.IsContentLabel(name))).Distinct().ToList();
        // Discovery metadata is derived; retain the exact submitted portable snapshot and hashes.
        row.Tags = JsonSerializer.Serialize(tags, DecisionDocumentValidator.JsonOptions);
    }
    public object Get(GetDecisionTags request)
    {
        var catalog = TagOptions.Catalog();
        var etag = Hash(JsonSerializer.Serialize(catalog, DecisionDocumentValidator.JsonOptions));
        var result = (HttpResult)Json(catalog, "decision-tags-" + etag);
        result.Headers["Cache-Control"] = "public, max-age=3600";
        return result;
    }
    public object Get(ViewPublishedDecisions request) => HttpResult.Redirect("/m#recipes");
    public async Task<object> Get(DownloadPublishedDecision request)
    {
        var row = await Find(request.ExternalRef); var result = new HttpResult(Encoding.UTF8.GetBytes(row.DocumentJson), "application/json");
        result.Headers["Content-Disposition"] = "attachment; filename=\"recipe.json\"; filename*=UTF-8''" + Uri.EscapeDataString(row.Filename);
        result.Headers["Cache-Control"] = "no-cache, must-revalidate"; result.Headers["ETag"] = '"' + row.RecipeHash + '"'; return result;
    }
    public async Task<object> Get(ViewPublishedDecision request)
    {
        var row = await Find(request.ExternalRef);
        var html = await PublishedViewerShell.Render(VirtualFileSources, Request, "recipe.mjs");
        html = html.Replace("<title>llms.py</title>", "<title>" + System.Net.WebUtility.HtmlEncode(row.Name) + " · Jev recipe</title>");
        var result = new HttpResult(html, "text/html"); result.Headers["Cache-Control"] = "no-cache, must-revalidate"; return result;
    }
}
