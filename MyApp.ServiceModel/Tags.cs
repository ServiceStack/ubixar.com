using ServiceStack;

namespace MyApp.ServiceModel;

public static class Tags
{
    public const string Comfy = nameof(Comfy);
    public const string Agent = nameof(Agent);
    public const string Posts = nameof(Posts);
    public const string Files = nameof(Files);
    public const string Artifacts = nameof(Artifacts);
    public const string AiInfo = nameof(AiInfo);
    public const string Admin = nameof(Admin);
    public const string Devices = nameof(Devices);
}

[Tag(Tags.Comfy)]
public class GetTagArtifactIds : IGet, IReturn<GetTagArtifactIdsResponse>
{
    [ValidateNotEmpty]
    public string Tag { get; set; }
    public int? AfterArtifactId { get; set; }
    public int? Skip { get; set; }
    public string? OrderBy { get; set; }
}
public class GetTagArtifactIdsResponse
{
    public int Total { get; set; }
    public List<int> Results { get; set; } = [];
    public ResponseStatus? ResponseStatus { get; set; }
}


[Tag(Tags.Comfy)]
public class GetCategoryArtifactIds : IGet, IReturn<GetCategoryArtifactIdsResponse>
{
    [ValidateNotEmpty]
    public string Category { get; set; }
    public int? AfterArtifactId { get; set; }
    public int? Skip { get; set; }
    public string? OrderBy { get; set; }
}
public class GetCategoryArtifactIdsResponse
{
    public int Total { get; set; }
    public List<int> Results { get; set; } = [];
    public ResponseStatus? ResponseStatus { get; set; }
}