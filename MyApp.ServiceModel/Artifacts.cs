using System.Runtime.Serialization;
using System.Text.Json.Serialization;
using ServiceStack;
using ServiceStack.DataAnnotations;

namespace MyApp.ServiceModel;

[Tag(Tags.Artifacts)]
public class GetPopularCategories : IGet, IReturn<GetPopularCategoriesResponse>
{
    public AssetType Type { get; set; }
    public int? Take { get; set; }
}
public class GetPopularCategoriesResponse
{
    public List<CategoryStat> Results { get; set; } = [];
    public ResponseStatus? ResponseStatus { get; set; }
}
public class CategoryStat
{
    public int Id { get; set; }
    public string Name { get; set; }
    public int Count { get; set; }
}

[Tag(Tags.Artifacts)]
public class QueryArtifacts : QueryDb<Artifact>
{
    public int? Id { get; set; }
    public string? Search { get; set; }
    public Rating? Rating { get; set; }
    public List<Rating>? Ratings { get; set; }
    public string? Category { get; set; }
    public string? Tag { get; set; }
    public int? VersionId { get; set; }
    public int? Similar { get; set; }
    public AssetType? Type { get; set; }
    public string? UserId { get; set; }
    public string? User { get; set; }
}

[Tag(Tags.Artifacts)]
public class GetArtifactVariants : IGet, IReturn<QueryResponse<Artifact>>
{
    public string? GenerationId { get; set; }
    [Input(Type = "tag"), FieldCss(Field = "col-span-12")]
    public List<int>? ArtifactIds { get; set; }
}

[Tag(Tags.Artifacts)]
[Route("/files/{**Path}")]
public class DownloadFile : IGet, IReturn<byte[]>
{
    [ValidateNotEmpty]
    public string Path { get; set; } = null!;
    public bool? Download { get; set; }
}

[Tag(Tags.Artifacts)]
[Route("/avatar/{UserName}", "GET")]
public class GetUserAvatar : IGet, IReturn<byte[]>
{
    public string UserName { get; set; }
}

[Tag(Tags.Artifacts)]
[Route("/artifacts/{**Path}")]
public class GetArtifact : IGet, IReturn<byte[]>
{
    [ValidateNotEmpty]
    public string Path { get; set; } = null!;
    public bool? Download { get; set; }
}

[Tag(Tags.Artifacts)]
[Route("/variants/{Variant}/{**Path}")]
public class GetVariant : IGet, IReturn<byte[]>
{
    [ValidateNotEmpty]
    public string Variant { get; set; } = null!;
    [ValidateNotEmpty]
    public string Path { get; set; } = null!;
}

[Tag(Tags.Artifacts)]
[ValidateIsAuthenticated]
public class PublishGeneration : IReturn<EmptyResponse>
{
    [ValidateNotEmpty]
    public string Id { get; set; }
}

[Tag(Tags.Artifacts)]
[ValidateIsAuthenticated]
public class ModerateArtifact : IReturn<EmptyResponse>
{
    public int Id { get; set; }
    public Rating? Rating { get; set; }
    public string? Tag { get; set; }
}

[Tag(Tags.Artifacts)]
[ValidateIsAuthenticated]
public class SubmitArtifactModeration : IReturn<Artifact>
{
    public int ArtifactId { get; set; }
    public bool? HideArtifact { get; set; }
    public Rating? Rating { get; set; }
    public int? PoorQuality { get; set; }
    public ReportType? ReportType { get; set; }
    public ReportTag? ReportTag { get; set; }
    public string? ReportComment { get; set; }
}

[Tag(Tags.Artifacts)]
[ValidateIsAuthenticated]
[AutoPopulate(nameof(ArtifactReaction.UserId), Eval = "userAuthId()")]
public class CreateArtifactReaction : ICreateDb<ArtifactReaction>, IReturn<ArtifactReaction>
{
    public int ArtifactId { get; set; }
    public Reaction Reaction { get; set; }
}

[Tag(Tags.Artifacts)]
[ValidateIsAuthenticated]
[AutoPopulate(nameof(ArtifactReaction.UserId), Eval = "userAuthId()")]
public class DeleteArtifactReaction : IDeleteDb<ArtifactReaction>, IReturn<IdResponse>
{
    public int ArtifactId { get; set; }
    public Reaction Reaction { get; set; }
}

[Tag(Tags.Artifacts)]
[ValidateIsAuthenticated]
[AutoFilter(QueryTerm.Ensure, nameof(ArtifactReaction.UserId), Eval = "userAuthId()")]
public class MyArtifactReactions : QueryDb<ArtifactReaction,ArtifactReactionInfo>
{
    public int? AfterId { get; set; }
}
public class ArtifactReactionInfo
{
    [AutoIncrement]
    public int Id { get; set; }
    [JsonPropertyName("a")]
    [Index]
    public int ArtifactId { get; set; }
    [JsonPropertyName("r")]
    public Reaction Reaction { get; set; }
}


[Tag(Tags.Artifacts)]
[ValidateIsAuthenticated]
[AutoFilter(QueryTerm.Ensure, nameof(ArtifactReaction.UserId), Eval = "userAuthId()")]
public class MyAchievements : QueryDb<Achievement,AchievementInfo>
{
    public int? AfterId { get; set; }
}

public class AchievementInfo
{
    [AutoIncrement]
    [JsonPropertyName("id")]
    public int Id { get; set; }
    [JsonPropertyName("t")]
    public AchievementType Type { get; set; }
    [JsonPropertyName("g")]
    public string? GenerationId { get; set; }
    [JsonPropertyName("a")]
    public int? ArtifactId { get; set; }
    [JsonPropertyName("r")]
    public string? RefId { get; set; }
    // [JsonPropertyName("ru")] // change mapping to UserName if needed
    // public string? RefUserId { get; set; }
    [JsonPropertyName("s")]
    public int Score { get; set; }
    [JsonPropertyName("d")]
    public long Created => new DateTimeOffset(CreatedDate).ToUnixTimeMilliseconds();
    [IgnoreDataMember]
    public DateTime CreatedDate { get; set; }
}


public class ModerationQueue : AuditBase
{
    [AutoIncrement]
    public int Id { get; set; }
    public int ArtifactId { get; set; }
    public Rating? Rating { get; set; }
    public bool? Hide { get; set; }
    public int? PoorQuality { get; set; }
    public ReportType? ReportType { get; set; }
    public ReportTag? ReportTag { get; set; }
    public string? ReportComment { get; set; }
    public ModerationDecision? Decision { get; set; }
    public string? Notes { get; set; }
}

public class HiddenArtifact
{
    [AutoIncrement]
    public int Id { get; set; }
    public int ArtifactId { get; set; }
    public string? UserId { get; set; }
    public string? Reason { get; set; }
    public DateTime? CreatedDate { get; set; }
}
public class ArtifactTag
{
    [AutoIncrement]
    public int Id { get; set; }
    [Index]
    public int TagId { get; set; }
    public int ArtifactId { get; set; }
    public int Score { get; set; }
    public string? UserId { get; set; }
}

public class Tag
{
    [AutoIncrement]
    public int Id { get; set; }
    public string Name { get; set; }
    public string? Description { get; set; }

    [IgnoreDataMember]
    public DateTime CreatedDate { get; set; }
    [IgnoreDataMember]
    public string? CreatedBy { get; set; }
}

public class Category
{
    [AutoIncrement]
    public int Id { get; set; }
    public string Name { get; set; }
    public string? Description { get; set; }
}
public class ArtifactCategory
{
    [AutoIncrement]
    public int Id { get; set; }
    [Index]
    public int CategoryId { get; set; }
    public int ArtifactId { get; set; }
    public int Score { get; set; }
}

[UniqueConstraint(nameof(ArtifactId), nameof(UserId), nameof(Reaction))]
public class ArtifactReaction
{
    [AutoIncrement]
    public int Id { get; set; }
    [Index]
    public int ArtifactId { get; set; }
    [Index]
    public string UserId { get; set; }
    public Reaction Reaction { get; set; }
    [Default("{SYSTEM_UTC}")]
    public DateTime CreatedDate { get; set; }
}

/// <summary>
/// CodePoints for emojis
/// ['👍','❤','😂','😢'].map(e => e.codePointAt(0)) == [128077, 10084, 128514, 128546]
/// [128077, 10084, 128514, 128546].map(i => String.fromCodePoint(i))
/// </summary>
[Flags]
public enum Reaction
{
    ThumbsUp = 128077,
    Heart = 10084,
    Laugh = 128514,
    Cry = 128546,
}

public enum ReportType
{
    NeedsReview,
    MatureContent,
    TOSViolation,
}

public enum ReportTag
{
    //AdultContent
    Nudity,
    ExplicitNudity,
    SexualActs,
    AdultProducts,
    
    //SuggestiveContent
    Underwear,
    Swimwear,
    PartialNudity,
    SexyAttire,
    SexualThemes,
    
    //Violence
    IntenseGore,
    GraphicViolence,
    WeaponRelatedViolence,
    SelfHarm,
    Death,
    
    //Disturbing
    EmaciatedFigures,
    DeceasedBodies,
    Hanging,
    Explosions,
    VisuallyDisturbing,
    OffensiveGestures,
    
    //Hate
    HateSymbols,
    NaziRelatedContent,
    RacistContent,
    ReligiousHate,
    HomophobicContent,
    TransphobicContent,
    SexistContent,
    ExtremistContent,
    
    //TOSViolations
    DepictionOfRealPersonContent,
    FalseImpersonation,
    IllegalContent,
    DepictionOfMinor,
    ChildAbuse,
    Spam,
    ProhibitedPrompts,
    
    //NeedsModeratorReview
    PotentialSecurityConcern,
    ContentShouldBeReviewed,
    IncorrectOrMisleadingContent,
    OtherConcern,
}

