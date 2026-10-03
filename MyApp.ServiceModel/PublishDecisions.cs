using System.Text.Json;
using System.Runtime.Serialization;
using ServiceStack;
using ServiceStack.Web;
using ServiceStack.DataAnnotations;

namespace MyApp.ServiceModel;

[Alias("PublishedRecipe")]
[CompositeIndex(nameof(PublishedBy), nameof(CreateIdempotencyKey), Unique = true)]
public class PublishedDecision
{
    [AutoIncrement] public long Id { get; set; }
    [Unique] public string ExternalRef { get; set; } = "";
    [Index] public string PublishedBy { get; set; } = "";
    public string Filename { get; set; } = "";
    public int SchemaVersion { get; set; }
    [StringLength(StringLengthAttribute.MaxText)] public string DocumentJson { get; set; } = "";
    public string RecipeHash { get; set; } = "";
    [StringLength(StringLengthAttribute.MaxText)] public string ExecutionJson { get; set; } = "";
    public string ContentHash { get; set; } = "";
    public string ExecutedModel { get; set; } = "";
    public DateTime ExecutedAt { get; set; }
    public string Name { get; set; } = "";
    [StringLength(StringLengthAttribute.MaxText)] public string Description { get; set; } = "";
    [StringLength(StringLengthAttribute.MaxText)] public string Tags { get; set; } = "[]";
    public int QuestionCount { get; set; }
    public int FieldCount { get; set; }
    public int ExampleCount { get; set; }
    public int Revision { get; set; }
    public DateTime PublishedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? UnpublishedAt { get; set; }
    public string CreateIdempotencyKey { get; set; } = "";
    public string CreateRequestHash { get; set; } = "";
}

// Stream requests enforce envelope limits before any JSON deserialization.
[ValidateApiKey, Route("/publish/decision", "POST")]
public class PublishDecision : IPost, IReturn<DecisionPublication>, IRequiresRequestStream
{
    public string Filename { get; set; } = "";
    public JsonElement Document { get; set; }
    public JsonElement Execution { get; set; }
    public string IdempotencyKey { get; set; } = "";
    [IgnoreDataMember] public Stream RequestStream { get; set; } = Stream.Null;
}
[ValidateApiKey, Route("/publish/decision/{ExternalRef}", "PUT")]
public class UpdatePublishedDecision : IPut, IReturn<DecisionPublication>, IRequiresRequestStream
{
    public string ExternalRef { get; set; } = "";
    public string Filename { get; set; } = "";
    public JsonElement Document { get; set; }
    public JsonElement Execution { get; set; }
    public int Revision { get; set; }
    [IgnoreDataMember] public Stream RequestStream { get; set; } = Stream.Null;
}
[ValidateApiKey, Route("/publish/decision/{ExternalRef}", "DELETE")]
public class UnpublishDecision : IDelete, IReturn<EmptyResponse>
{
    public string ExternalRef { get; set; } = "";
    public int Revision { get; set; }
}
[Route("/publish/decision/{ExternalRef}", "GET")]
public class GetPublishedDecision : IGet, IReturn<DecisionPublication>
{
    public string ExternalRef { get; set; } = "";
}
[Route("/publish/decisions", "GET")]
public class QueryPublishedDecisions : IGet, IReturn<DecisionCatalog>
{
    public string? Q { get; set; }
    public string? Tag { get; set; }
    public string? User { get; set; }
    public int Skip { get; set; }
    public int Take { get; set; } = 20;
    public string? OrderBy { get; set; }
}
[ValidateRequest("DecisionOwner()"), Route("/publish/decisions/mine", "GET")]
public class MyPublishedDecisions : QueryPublishedDecisions { }
[ValidateIsAuthenticated, Route("/publish/decisions/mine/{ExternalRef}", "DELETE")]
public class UnpublishMyDecision : IDelete, IReturn<EmptyResponse>
{
    public string ExternalRef { get; set; } = "";
    public int Revision { get; set; }
}
[Route("/d/{ExternalRef}", "GET")]
public class ViewPublishedDecision : IGet, IReturn<string>
{
    public string ExternalRef { get; set; } = "";
}
[Route("/d/{ExternalRef}/recipe.json", "GET"), Route("/d/{ExternalRef}/recipe", "GET")]
public class DownloadPublishedDecision : IGet, IReturn<byte[]>
{
    public string ExternalRef { get; set; } = "";
}
[Route("/d", "GET")]
public class ViewPublishedDecisions : IGet, IReturn<string> { }

public class DecisionAuthor
{
    public string UserName { get; set; } = "";
    public string DisplayName { get; set; } = "";
}
public class DecisionPublication
{
    public string ExternalRef { get; set; } = "";
    public string PublishedUrl { get; set; } = "";
    public string DownloadUrl { get; set; } = "";
    public string Filename { get; set; } = "";
    public int Revision { get; set; }
    public string ContentHash { get; set; } = "";
    public string RecipeHash { get; set; } = "";
    public DateTime PublishedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DecisionAuthor Author { get; set; } = new();
    public string Name { get; set; } = "";
    [StringLength(StringLengthAttribute.MaxText)] public string Description { get; set; } = "";
    public List<string> Tags { get; set; } = [];
    public int SchemaVersion { get; set; }
    public int QuestionCount { get; set; }
    public int FieldCount { get; set; }
    public int ExampleCount { get; set; }
    public string ExecutedModel { get; set; } = "";
    public DateTime ExecutedAt { get; set; }
    public JsonElement? Document { get; set; }
    public JsonElement? Execution { get; set; }
}
public class DecisionCatalog
{
    public List<DecisionPublication> Items { get; set; } = [];
    public int Skip { get; set; }
    public int Take { get; set; }
    public bool HasMore { get; set; }
}
