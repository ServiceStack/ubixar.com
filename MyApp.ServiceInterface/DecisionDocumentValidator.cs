using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using System.Globalization;
using HttpError = ServiceStack.HttpError;
using ErrorResponse = ServiceStack.ErrorResponse;
using ResponseStatus = ServiceStack.ResponseStatus;
using ResponseError = ServiceStack.ResponseError;

namespace MyApp.ServiceInterface;

/// <summary>The portable Jev v1 contract. JSON DOM preserves values and never evaluates content.</summary>
public static class DecisionDocumentValidator
{
    public const int DocumentLimit = 512 * 1024, ExecutionLimit = 2 * 1024 * 1024, EnvelopeLimit = 3 * 1024 * 1024;
    public static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, MaxDepth = 32, Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping };
    static readonly string[] Models = ["~typesafe/jev-latest", "typesafe/jev-1.13", "typesafe/jev-1.13-20260917"];
    static void Need(bool valid, string path, string message)
    {
        if (!valid) throw new HttpError(400, "ValidationError", path + ": " + message)
        {
            Response = new ErrorResponse
            {
                ResponseStatus = new ResponseStatus
                {
                    ErrorCode = "ValidationError",
                    Message = path + ": " + message,
                    Errors = [new ResponseError { FieldName = path, Message = message }]
                }
            }
        };
    }
    public static string Serialize(JsonNode? node) => node?.ToJsonString(JsonOptions) ?? "null";
    static void Object(JsonNode? n, string p) => Need(n is JsonObject, p, "Expected an object.");
    static string Str(JsonNode? n) => n is JsonValue v && v.TryGetValue<string>(out var s) ? s : "";
    static bool IsString(JsonNode? n) => n is JsonValue v && v.TryGetValue<string>(out _);
    static bool Number(JsonNode? n, out double d) { d = 0; return n is JsonValue v && v.TryGetValue<double>(out d) && double.IsFinite(d); }
    static bool Boolean(JsonNode? n) => n is JsonValue v && v.TryGetValue<bool>(out _);
    static bool Int(JsonNode? n, out int value) { value = 0; return n is JsonValue v && v.TryGetValue<int>(out value); }
    static bool Bool(JsonNode? n, bool fallback = false) => Boolean(n) ? n!.GetValue<bool>() : fallback;
    static int Length(string s) => s.EnumerateRunes().Count();
    static JsonNode? Default(JsonNode node, string key, JsonNode fallback) => node.AsObject().ContainsKey(key) ? node[key] : fallback;
    static IEnumerable<string> Keys(JsonNode? n) => n is JsonObject o ? o.Select(x => x.Key) : [];
    static void Allowed(JsonNode? n, string p, params string[] allowed) { Object(n, p); Need(Keys(n).All(allowed.Contains), p, "Remove unsupported fields."); }
    static void Text(JsonNode? n, string p, int max = 8000, bool empty = false) => Need(IsString(n) && Length(Str(n)) <= max && (empty || !string.IsNullOrWhiteSpace(Str(n))), p, "Enter valid text.");
    static void Key(string s, string p) => Need(Regex.IsMatch(s, @"^[A-Za-z][A-Za-z0-9_]{0,63}$") && !new[] { "constructor", "prototype", "__proto__" }.Contains(s), p, "Invalid key.");
    public static void Filename(string filename)
    {
        var stem = filename.Length >= 5 ? filename[..^5] : "";
        Need(filename.EndsWith(".json", StringComparison.OrdinalIgnoreCase) && Encoding.UTF8.GetByteCount(filename) <= 245 &&
             !string.IsNullOrWhiteSpace(stem) && stem == stem.Trim() && !stem.EndsWith('.') && !stem.Equals("_drafts", StringComparison.OrdinalIgnoreCase) &&
             filename == filename.Trim() && !Regex.IsMatch(filename, "[<>:\"/\\\\|?*\\x00-\\x1f]") &&
             !Regex.IsMatch(filename, @"^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?$", RegexOptions.IgnoreCase), "filename", "Use a portable .json filename.");
    }
    public static JsonObject Parse(string json, int limit)
    {
        Need(Encoding.UTF8.GetByteCount(json) <= limit, "document", "Content exceeds the size limit.");
        try
        {
            var node = JsonNode.Parse(json, documentOptions: new JsonDocumentOptions { MaxDepth = 32 });
            Object(node, "document"); return (JsonObject)node!;
        }
        catch (JsonException) { throw new HttpError(400, "ValidationError", "Provide valid JSON with at most 32 levels."); }
    }
    public static void Schema(JsonNode? s, string p = "inputSchema", int depth = 0)
    {
        Allowed(s, p, "type", "title", "description", "default", "properties", "required", "additionalProperties", "items", "enum", "format", "minLength", "maxLength", "minimum", "maximum", "minItems", "maxItems");
        Need(depth <= 4, p, "Use at most four nested levels.");
        var kind = Str(s!["type"]);
        Need(new[] { "object", "string", "number", "integer", "boolean", "array" }.Contains(kind), p + ".type", "Unsupported type.");
        foreach (var name in new[] { "title", "description" }) if (s.AsObject().ContainsKey(name)) Text(s[name], p + "." + name, empty: true);
        if (s.AsObject().ContainsKey("format")) Need(kind == "string" && new[] { "textarea", "date", "email" }.Contains(Str(s["format"])), p, "Unsupported format.");
        foreach (var (lo, hi, k) in new[] { ("minLength", "maxLength", "string"), ("minItems", "maxItems", "array"), ("minimum", "maximum", "numeric") })
        {
            foreach (var name in new[] { lo, hi }) if (s.AsObject().ContainsKey(name))
            {
                Need((k == "numeric" ? kind is "number" or "integer" : kind == k) && Number(s[name], out _), p + "." + name, "Invalid bound.");
                if (k != "numeric") Need(Int(s[name], out var v) && v >= 0, p + "." + name, "Use a nonnegative integer.");
            }
            if (Number(s[lo], out var l) && Number(s[hi], out var h)) Need(l <= h, p, "Lower bound exceeds upper bound.");
        }
        if (kind == "object")
        {
            var props = Default(s, "properties", new JsonObject()); Object(props, p + ".properties"); Need(props.AsObject().Count <= 32, p, "Use at most 32 fields.");
            var required = Default(s, "required", new JsonArray()); Need(required is JsonArray, p, "Expected required fields.");
            Need(required.AsArray().All(x => IsString(x) && props.AsObject().ContainsKey(Str(x))) && required.AsArray().Select(Str).Distinct().Count() == required.AsArray().Count, p, "Invalid required fields.");
            if (s.AsObject().ContainsKey("additionalProperties")) Need(Boolean(s["additionalProperties"]), p, "Use true or false.");
            foreach (var prop in props.AsObject()) { Key(prop.Key, p + "." + prop.Key); Schema(prop.Value, p + "." + prop.Key, depth + 1); }
        }
        else Need(!Keys(s).Intersect(new[] { "properties", "required", "additionalProperties" }).Any(), p, "Object keywords require object type.");
        if (kind == "array") { Schema(s["items"], p + ".items", depth + 1); Need(Str(s["items"]!["type"]) is not ("array" or "object"), p, "Array items must be primitives."); }
        else Need(!s.AsObject().ContainsKey("items"), p, "items requires array type.");
        if (s.AsObject().ContainsKey("enum"))
        {
            Need(kind is not ("array" or "object") && s["enum"] is JsonArray a && a.Count is >= 1 and <= 255, p, "Use 1–255 primitive options.");
            var options = s["enum"]!.AsArray();
            Need(options.Select(Serialize).Distinct().Count() == options.Count, p, "Remove duplicate options.");
            var plain = s.DeepClone(); plain!.AsObject().Remove("enum"); plain.AsObject().Remove("default");
            foreach (var item in options) Input(plain, item, p + ".enum");
        }
        if (s.AsObject().ContainsKey("default")) { var plain = s.DeepClone(); plain!.AsObject().Remove("default"); Input(plain, s["default"], p + ".default", false); }
    }
    public static void Input(JsonNode? schema, JsonNode? value, string p = "input", bool required = true)
    {
        var kind = Str(schema!["type"]);
        if (kind == "object")
        {
            Object(value, p); var props = Default(schema, "properties", new JsonObject());
            Need(Bool(schema["additionalProperties"]) || Keys(value).All(Keys(props).Contains), p, "Remove unknown input fields.");
            var req = (schema["required"] as JsonArray)?.Select(Str).ToHashSet() ?? [];
            foreach (var name in req) Need(value!.AsObject().ContainsKey(name) && value[name] != null, p + "." + name, "Required field.");
            foreach (var item in value!.AsObject()) if (props.AsObject().ContainsKey(item.Key)) Input(props[item.Key], item.Value, p + "." + item.Key, req.Contains(item.Key));
        }
        else if (kind == "array")
        {
            Need(value is JsonArray, p, "Expected a list."); Bounds(schema, value!.AsArray().Count, p, "minItems", "maxItems", 0, 500);
            foreach (var item in value.AsArray()) Input(schema["items"], item, p);
        }
        else if (kind == "string")
        {
            Need(IsString(value) && (!required || !string.IsNullOrWhiteSpace(Str(value))), p, "Expected text.");
            if (required || Str(value).Length > 0) Bounds(schema, Length(Str(value)), p, "minLength", "maxLength", 0, DocumentLimit);
        }
        else if (kind == "boolean") Need(Boolean(value), p, "Expected true or false.");
        else { Need(Number(value, out var num) && (kind != "integer" || num == Math.Truncate(num)), p, "Expected a finite number."); Bounds(schema, num, p, "minimum", "maximum", double.NegativeInfinity, double.PositiveInfinity); }
        if (schema.AsObject().ContainsKey("enum")) Need(schema["enum"]!.AsArray().Any(x => Same(x, value)), p, "Choose a listed option.");
    }
    static bool Same(JsonNode? a, JsonNode? b) => JsonNode.DeepEquals(a, b) || Number(a, out var x) && Number(b, out var y) && x == y;
    static void Bounds(JsonNode s, double num, string p, string low, string high, double lo, double hi) => Need(num >= (Number(s[low], out var l) ? l : lo) && num <= (Number(s[high], out var h) ? h : hi), p, "Value outside allowed range.");
    static int JsonSpaceBytes(JsonNode? node)
    {
        if (node is JsonObject obj) return obj.Count + Math.Max(0, obj.Count - 1) + obj.Sum(pair => JsonSpaceBytes(pair.Value));
        if (node is JsonArray array) return Math.Max(0, array.Count - 1) + array.Sum(JsonSpaceBytes);
        if (node is JsonValue value && value.GetValueKind() == JsonValueKind.Number)
            Need(Number(node, out _), "document", "Use finite JSON numbers.");
        return 0;
    }
    public static void Document(JsonNode? d)
    {
        Allowed(d, "recipe", "schemaVersion", "name", "description", "tags", "decisionModel", "inputSchema", "state", "questions", "presentation", "examples");
        Need(Encoding.UTF8.GetByteCount(Serialize(d)) + JsonSpaceBytes(d) <= DocumentLimit, "document", "Keep the document under 512 KiB.");
        Need(Int(d!["schemaVersion"], out var version) && version == 1, "schemaVersion", "Only recipe version 1 is supported.");
        Text(d["name"], "name", 120); Text(Default(d, "description", JsonValue.Create("")!), "description", 2000, true);
        var tags = Default(d, "tags", new JsonArray()); Need(tags is JsonArray && tags.AsArray().Count <= 12, "tags", "Use up to 12 tags."); foreach (var tag in tags.AsArray()) Text(tag, "tags", 40);
        Need(Models.Contains(Str(d["decisionModel"])), "decisionModel", "Choose a supported Jev model.");
        Schema(d["inputSchema"]); Need(Str(d["inputSchema"]!["type"]) == "object", "inputSchema", "Root must be object.");
        var state = Default(d, "state", new JsonObject { ["mode"] = "object" }); Allowed(state, "state", "mode", "field");
        Need(Str(state["mode"]) is "object" or "text", "state", "Choose text or object mode.");
        if (Str(state["mode"]) == "text") Need(IsString(state["field"]) && Str((d["inputSchema"]!["properties"] as JsonObject)?[Str(state["field"])]?["type"]) == "string", "state.field", "Choose a top-level text field.");
        var qs = d["questions"]; Object(qs, "questions"); Need(qs!.AsObject().Count is >= 1 and <= 32, "questions", "Use 1–32 questions.");
        foreach (var pair in qs.AsObject())
        {
            var p = "questions." + pair.Key; Key(pair.Key, p); var q = pair.Value; Allowed(q, p, "type", "instructions", "criteria"); Text(q!["instructions"], p + ".instructions");
            var kind = Str(q["type"]); Need(kind is "choice" or "score" or "noul", p, "Unsupported question type.");
            if (kind == "score") { Need(q["criteria"] is JsonArray a && a.Count is >= 2 and <= 10, p, "Use 2–10 scale descriptions."); foreach (var c in q["criteria"]!.AsArray()) Text(c, p); }
            if (kind == "choice") { Object(q["criteria"], p); Need(q["criteria"]!.AsObject().Count is >= 2 and <= 255, p, "Use 2–255 options."); foreach (var c in q["criteria"]!.AsObject()) { Key(c.Key, p); Text(c.Value, p); } }
            if (kind == "noul" && q["criteria"] != null) { Object(q["criteria"], p); Need(Keys(q["criteria"]).ToHashSet().SetEquals(new[] { "true", "false" }), p, "Describe both true and false."); foreach (var c in q["criteria"]!.AsObject()) Text(c.Value, p); }
        }
        var pres = Default(d, "presentation", new JsonObject()); Allowed(pres, "presentation", "questions"); var labels = Default(pres!, "questions", new JsonObject()); Object(labels, "presentation.questions");
        Need(Keys(labels).All(Keys(qs).Contains), "presentation", "Labels must refer to existing questions.");
        foreach (var pair in labels.AsObject())
        {
            Allowed(pair.Value, "presentation", "label", "optionLabels"); if (pair.Value!.AsObject().ContainsKey("label")) Text(pair.Value["label"], "presentation", 200);
            if (pair.Value.AsObject().ContainsKey("optionLabels"))
            {
                var opts = pair.Value["optionLabels"]; Object(opts, "presentation"); Need(Str(qs[pair.Key]!["type"]) == "choice" && Keys(opts).All(Keys(qs[pair.Key]!["criteria"]).Contains), "presentation", "Invalid option labels.");
                foreach (var label in opts!.AsObject()) Text(label.Value, "presentation", 200);
            }
        }
        var examples = Default(d, "examples", new JsonArray()); Need(examples is JsonArray && examples.AsArray().Count <= 30, "examples", "Use up to 30 examples."); var ids = new HashSet<string>();
        foreach (var e in examples.AsArray())
        {
            Allowed(e, "examples", "id", "label", "input", "expected", "provenance", "notes"); Text(e!["id"], "examples.id", 80); Need(ids.Add(Str(e["id"])), "examples.id", "Use unique IDs."); Text(e["label"], "examples.label", 120);
            Input(d["inputSchema"], e["input"], "examples.input"); var expected = Default(e, "expected", new JsonObject()); Object(expected, "examples.expected"); Need(Keys(expected).All(Keys(qs).Contains), "examples.expected", "Unknown question.");
            foreach (var pair in expected.AsObject()) { var q = qs[pair.Key]!; var kind = Str(q["type"]); Need(kind == "choice" ? IsString(pair.Value) && Keys(q["criteria"]).Contains(Str(pair.Value)) : kind == "noul" ? Boolean(pair.Value) : Number(pair.Value, out var num) && num >= 0 && num <= q["criteria"]!.AsArray().Count - 1, "examples.expected", "Invalid expected answer."); }
            Need(new[] { "authored", "ai-suggested", "user-reviewed" }.Contains(Str(Default(e, "provenance", JsonValue.Create("authored")!))), "examples.provenance", "Invalid provenance.");
            if (e.AsObject().ContainsKey("notes")) Text(e["notes"], "examples.notes", 2000, true);
        }
    }
    public static void Execution(JsonNode d, JsonNode? e)
    {
        Allowed(e, "execution", "status", "input", "prompt", "answers", "model", "completedAt", "durationMs");
        Need(Encoding.UTF8.GetByteCount(Serialize(e)) + JsonSpaceBytes(e) <= ExecutionLimit, "execution", "Run a smaller example: results must fit in 2 MiB.");
        Need(Str(e!["status"]) == "succeeded", "execution.status", "A successful execution is mandatory."); Input(d["inputSchema"], e["input"]);
        var mapping = d["state"]; var prompt = Str(mapping?["mode"]) == "text" ? e["input"]?[Str(mapping!["field"])] ?? JsonValue.Create("") : e["input"];
        Need(!(IsString(prompt) && Str(prompt) == "") && Same(prompt, e["prompt"]), "execution.prompt", "Prompt does not match compiled input.");
        Text(e["model"], "execution.model", 200);
        Need(DateTimeOffset.TryParse(Str(e["completedAt"]), CultureInfo.InvariantCulture, DateTimeStyles.None, out var at) && at.Offset == TimeSpan.Zero && Regex.IsMatch(Str(e["completedAt"]), @"(?:Z|\+00:00)$"), "execution.completedAt", "Use a UTC completion timestamp.");
        if (e.AsObject().ContainsKey("durationMs")) Need(Number(e["durationMs"], out var ms) && ms >= 0, "execution.durationMs", "Use nonnegative duration.");
        var qs = d["questions"]!; var answers = e["answers"]; Object(answers, "execution.answers"); Need(Keys(answers).ToHashSet().SetEquals(Keys(qs)), "execution.answers", "Return every requested answer.");
        foreach (var pair in qs.AsObject())
        {
            var q = pair.Value!; var a = answers![pair.Key]; var kind = Str(q["type"]); var p = "execution.answers." + pair.Key;
            Allowed(a, p, kind == "noul" ? new[] { "type", "noul" } : kind == "choice" ? new[] { "type", "choice", "probabilities", "confidence" } : new[] { "type", "score", "probabilities", "confidence", "legend" });
            Need(Str(a!["type"]) == kind, p, "Unexpected answer type.");
            if (kind == "noul") { Probability(a["noul"], p); continue; }
            var options = kind == "choice" ? Keys(q["criteria"]).ToArray() : Enumerable.Range(0, q["criteria"]!.AsArray().Count).Select(i => i.ToString()).ToArray();
            var probs = a["probabilities"]; Object(probs, p); Need(Keys(probs).ToHashSet().SetEquals(options), p, "Invalid probability options.");
            double sum = 0; foreach (var prob in probs!.AsObject()) { Probability(prob.Value, p); sum += prob.Value!.GetValue<double>(); }
            Need(Math.Abs(sum - 1) <= 0.025, p, "Probabilities do not sum to one.");
            Need(a.AsObject().ContainsKey("confidence"), p, "Use normalized answers, including nullable confidence.");
            if (a["confidence"] != null) Probability(a["confidence"], p);
            if (kind == "choice") Need(options.Contains(Str(a["choice"])), p, "Invalid selected option.");
            else { Need(Number(a["score"], out var score) && score >= 0 && score <= options.Length - 1, p, "Invalid score."); Object(a["legend"], p); Need(Keys(a["legend"]).ToHashSet().SetEquals(options), p, "Invalid scale legend."); foreach (var i in options) Need(Same(a["legend"]![i], q["criteria"]![int.Parse(i)]), p, "Legend differs from rubric."); }
        }
    }
    static void Probability(JsonNode? n, string p) => Need(Number(n, out var v) && v >= 0 && v <= 1, p, "Invalid probability.");
}
