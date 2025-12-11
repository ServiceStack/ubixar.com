using ServiceStack;

namespace MyApp.ServiceModel;

[ValidateIsAdmin]
public class QueryUsers : QueryDb<User>
{
    public string? Id { get; set; }
}

[Route("/appdata")]
[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class GetAppData : IGet, IReturn<GetAppDataResponse> {}
public class GetAppDataResponse
{
    public int AssetCount { get; set; }
    public int WorkflowCount { get; set; }
    public Dictionary<string, int> AgentEventCounts { get; set; }
    public List<AgentInfo> Agents { get; set; }
    public HashSet<string> DefaultGatewayNodes { get; set; } 
    public ResponseStatus? ResponseStatus { get; set; }
}

[Route("/appinfo")]
[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class AppInfo : IGet, IReturn<AppInfoResponse>
{
}
public class AppInfoResponse
{
    // Process / memory
    public int ProcessId { get; set; }
    public DateTime StartTime { get; set; }
    public TimeSpan Uptime { get; set; }
    public long WorkingSetBytes { get; set; }
    public long PrivateMemoryBytes { get; set; }
    public long ManagedMemoryBytes { get; set; }
    public long GcTotalAllocatedBytes { get; set; }
    public int GcGen0Collections { get; set; }
    public int GcGen1Collections { get; set; }
    public int GcGen2Collections { get; set; }

    // CPU
    public TimeSpan TotalProcessorTime { get; set; }
    public TimeSpan UserProcessorTime { get; set; }
    public double CpuUsagePercentApprox { get; set; }

    // Threads
    public int ThreadCount { get; set; }
    public List<ThreadInfo> Threads { get; set; } = [];

    // Npgsql / DB connection stats (from pg_stat_activity)
    public int PgTotalConnections { get; set; }
    public int PgActiveConnections { get; set; }
    public int PgIdleConnections { get; set; }
    public int PgIdleInTransaction { get; set; }
    public int PgWaitingConnections { get; set; }

    // Pool settings (parsed from connection string when available)
    public int? PoolMaxSize { get; set; }
    public int? PoolMinSize { get; set; }
    public bool? Pooling { get; set; }

    public ResponseStatus? ResponseStatus { get; set; }
}

public class ThreadInfo
{
    public int ManagedThreadId { get; set; }
    public string? Name { get; set; }
    public string State { get; set; }
    public TimeSpan TotalProcessorTime { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class HardDeleteWorkflow : IDeleteDb<Workflow>, IReturn<StringResponse>
{
    [ValidateGreaterThan(0)]
    [Input(Type="lookup", Options = "{refId:'id',model:'Workflow',refLabel:'Name'}")]
    public int Id { get; set; }
    public bool Force { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class HardDeleteGenerations : IPost, IReturn<HardDeleteGenerationsResponse>
{
    public int Limit { get; set; }
    public bool Delete { get; set; }
}
public class HardDeleteGenerationsResponse
{
    public string Effect { get; set; }
    public List<GenerationRef> Results { get; set; } = [];
    public ResponseStatus? ResponseStatus { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class HardDeleteArtifact : IPost, IReturn<StringsResponse>
{
    public int ArtifactId { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class DeleteMissingArtifacts : IPost, IReturn<StringsResponse>
{
    public bool Delete { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class DeleteDuplicateArtifacts : IPost, IReturn<DeleteDuplicateArtifactsResponse>
{
    public bool Delete { get; set; }
}
public class DeleteDuplicateArtifactsResponse
{
    public Dictionary<string, int> UrlCounts { get; set; }
    public List<Artifact> DeletedArtifacts { get; set; } = [];
    public ResponseStatus? ResponseStatus { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class PopulateMissingArtifacts : IPost, IReturn<StringsResponse>
{
    public bool Populate { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class RegenerateGenerationResults : IPost, IReturn<StringResponse>
{
    public bool Regenerate { get; set; }
}

public class GenerationRef
{
    public string Id { get; set; }
    public string? PositivePrompt { get; set; }
    public List<string> ArtifactUrls { get; set; } = [];
    public List<string> ArtifactPaths { get; set; } = [];
    public int? PublicThreadId { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class QueryWorkflowGenerations : QueryDb<WorkflowGeneration>, IReturn<StringResponse>
{
    public string? Id { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class HardDeleteWorkflowGeneration : IDeleteDb<WorkflowGeneration>, IReturn<StringResponse>
{
    [ValidateNotEmpty]
    public string Id { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class RequeueFailedThreadGenerations : IPost, IReturn<StringResponse>
{
    [ValidateGreaterThan(0)]
    public int ThreadId { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class Clean : IPost, IReturn<CleanResponse>
{
    public bool Force { get; set; }
}
public class CleanResponse
{
    public Dictionary<string, int> Summary { get; set; } = new();
    public List<string> EmptyGenerations { get; set; } = [];
    public List<string> MissingGenerationFiles { get; set; } = [];
    public List<string> MissingDbArtifacts { get; set; } = [];
    // Url => ArtifactId[]
    public Dictionary<string, int[]> MultipleDbArtifacts { get; set; } = new();
    public List<string> Errors { get; set; } = [];
    public List<string> Actions { get; set; } = [];
    public ResponseStatus? ResponseStatus { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class CreateMissingArtifactTags : IPost, IReturn<CreateMissingArtifactTagsResponse>
{
}
public class CreateMissingArtifactTagsResponse
{
    public int TagsCreated { get; set; }
    public int ArtifactTagsCreated { get; set; }
    public ResponseStatus? ResponseStatus { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class CreateMissingArtifactCategories : IPost, IReturn<CreateMissingArtifactCategoriesResponse>
{
}
public class CreateMissingArtifactCategoriesResponse
{
    public int CategoriesCreated { get; set; }
    public int ArtifactCategoriesCreated { get; set; }
    public ResponseStatus? ResponseStatus { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class RecreateArtifactCategories : IPost, IReturn<StringResponse>
{
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class RecreateArtifactTags : IPost, IReturn<StringResponse>
{
}


[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class CreateMissingAvatars : IPost, IReturn<StringsResponse> {}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class SendCaptionArtifactEvent : IPost, IReturn<StringsResponse>
{
    [Input(Type = "tag"), FieldCss(Field = "col-span-12")]
    public List<int>? ArtifactIds { get; set; }
    public string? Model { get; set; }
    public int? Take { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class GenerateCaptionArtifact : IPost, IReturn<StringsResponse>
{
    [Input(Type = "tag"), FieldCss(Field = "col-span-12")]
    public List<int>? ArtifactIds { get; set; }
    public string? Model { get; set; }
    public int? Take { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class ReloadAgentEvents : IPost, IReturn<StringResponse>
{
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class MigrateToPostgres : IGet, IReturn<StringResponse>
{
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class AiChat : IPost, IReturn<StringResponse>
{
    public string? Model { get; set; }

    [ValidateNotEmpty]
    [Input(Type = "textarea"), FieldCss(Field = "col-span-12 text-center")]
    public string Prompt { get; set; }

    [Input(Type = "textarea"), FieldCss(Field = "col-span-12 text-center")]
    public string? SystemPrompt { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class GetAiChat : IGet, IReturn<GetAiChatResponse>
{
    public long? Id { get; set; }
    public bool? IncludeDetails { get; set; }
}
public class GetAiChatResponse
{
    public string Result { get; set; }
    public OpenAiChatResponse? Response { get; set; }
    public ResponseStatus? ResponseStatus { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class PinToWorkflowVersion : IPost, IReturn<EmptyResponse>
{
    [ValidateGreaterThan(0)]
    public int VersionId { get; set; }
    [ValidateNotEmpty]
    public string PosterImage { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class FeatureArtifact : IPost, IReturn<Artifact>
{
    [ValidateGreaterThan(0)]
    public int ArtifactId { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class UnFeatureArtifact : IPost, IReturn<Artifact>
{
    [ValidateGreaterThan(0)]
    public int ArtifactId { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class UpdateWorkflowVersion : IPost, IReturn<UpdateWorkflowVersionResponse>
{
    [ValidateGreaterThan(0)]
    [Input(Type="lookup", Options = "{refId:'id',model:'WorkflowVersion',refLabel:'Name'}")]
    public int VersionId { get; set; }
    [Input(Type = "file")]
    public string? Workflow { get; set; }
}
public class UpdateWorkflowVersionResponse
{
    public int VersionId { get; set; }
    public int Updated { get; set; }
    public List<string> Nodes { get; set; }
    public List<string> Assets { get; set; }
    public WorkflowInfo Info { get; set; }
    public ResponseStatus? ResponseStatus { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class ParseWorkflowVersions : IPost, IReturn<StringsResponse>
{
    public int? VersionId { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class ResizeImages : IPost, IReturn<StringsResponse>
{
    public string? Id { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    
    public int? Limit { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class FixGenerations : IPost, IReturn<StringsResponse>
{
    public int? Take { get; set; }
    public string? Type { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class UpdateAudioTags : IPost, IReturn<StringsResponse>
{
    [ValidateNotEmpty]
    public string ArtifactPath { get; set; }
    public Dictionary<string, double> ArtifactTags { get; set; }
}

[Tag(Tags.Admin)]
[ValidateIsAdmin]
public class GetPendingArtifactTasks : IGet, IReturn<GetPendingArtifactTasksResponse>
{
}
public class GetPendingArtifactTasksResponse
{
    public List<int> MissingArtifacts { get; set; } = [];
    public List<int> ExistingCaptionArtifacts { get; set; } = [];
    public List<int> ExistingDescribeArtifacts { get; set; } = [];
    public List<int> RequeueCaptionArtifacts { get; set; } = [];
    public List<int> RequeueDescribeArtifacts { get; set; } = [];
    public ResponseStatus? ResponseStatus { get; set; }
}