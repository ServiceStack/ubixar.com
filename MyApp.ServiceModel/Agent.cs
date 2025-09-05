using System.Runtime.Serialization;
using ServiceStack;
using ServiceStack.DataAnnotations;

namespace MyApp.ServiceModel;

public class Asset
{
    [AutoIncrement]
    public int Id { get; set; }
    public string Name { get; set; }
    public string? Type { get; set; }
    public string? Base { get; set; }
    public string SavePath { get; set; }
    public string FileName { get; set; }
    public string? Description { get; set; }
    public string? Reference { get; set; }
    public string Url { get; set; }
    public string? Token { get; set; }
    public string Size { get; set; }   // e.g. "4.71MB"
    public long Length { get; set; }   // Length in Bytes
    public string? Hash { get; set; }  // SHA256
    public DateTime? LastChecked { get; set; }
    public DateTime? ModifiedDate { get; set; }
    public string? ModifiedBy { get; set; }
}

public class Document
{
    [AutoIncrement] 
    public int Id { get; set; }
    public string Type { get; set; }
    [PgSqlJsonB] 
    public string Content { get; set; }
    [PgSqlJsonB] 
    public Dictionary<string,object?>? Args { get; set; }
    public long? RefId { get; set; }
    public string RefIdStr { get; set; }
    public string CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
}

[ValidateApiKey]
[Tag(Tags.Agent)]
public class GetComfyAgentEvents : IGet, IReturn<GetComfyAgentEventsResponse>
{
    [ValidateNotEmpty, ValidateExactLength(32)]
    public string DeviceId { get; set; }
}
public class GetComfyAgentEventsResponse
{
    public List<AgentEvent> Results { get; set; } = [];
    public ResponseStatus? ResponseStatus { get; set; }
}
public class AgentEvent
{
    public string Name { get; set; }
    public Dictionary<string, string?>? Args { get; set; }
}

[ValidateApiKey]
[Tag(Tags.Agent)]
public class UpdateComfyAgent : IPost, IReturn<EmptyResponse>
{
    [ValidateNotEmpty, ValidateExactLength(32)]
    public string DeviceId { get; set; }
    public int QueueCount { get; set; }
    public string? Status { get; set; }
    public ResponseStatus? Error { get; set; }
    public List<GpuInfo>? Gpus { get; set; }
    public Dictionary<string, List<string>>? Models { get; set; }
    public List<string>? LanguageModels { get; set; }
    public List<string>? InstalledPip { get; set; }
    public List<string>? InstalledNodes { get; set; }
    public List<string>? InstalledModels { get; set; }
    public List<string>? RunningGenerationIds { get; set; }
    public List<string>? QueuedGenerationIds { get; set; }
}

[ValidateApiKey]
[Tag(Tags.Agent)]
public class UpdateComfyAgentStatus : IPost, IReturn<EmptyResponse>
{
    [ValidateNotEmpty, ValidateExactLength(32)]
    public string DeviceId { get; set; }
    public string? Status { get; set; }
    public string? Logs { get; set; }
    public ResponseStatus? Error { get; set; }
}

[ValidateApiKey]
[Tag(Tags.Agent)]
public class RegisterComfyAgent : IPost, IReturn<RegisterComfyAgentResponse>
{
    [ValidateNotEmpty, ValidateExactLength(32)]
    public string DeviceId { get; set; }
    public int Version { get; set; }
    public string ComfyVersion { get; set; }
    public List<string> Workflows { get; set; }
    public int QueueCount { get; set; }
    public List<GpuInfo>? Gpus { get; set; }
    public Dictionary<string, List<string>>? Models { get; set; }
    public List<string>? LanguageModels { get; set; }
    public List<string>? InstalledPip { get; set; }
    public List<string>? InstalledNodes { get; set; }
    public List<string>? InstalledModels { get; set; }
    public ComfyAgentConfig Config { get; set; }
}

public class RegisterComfyAgentResponse
{
    public int Id { get; set; }
    public string ApiKey { get; set; }
    public string DeviceId { get; set; }
    public List<string> Nodes { get; set; }
    public List<string> Categories { get; set; }
    public List<string>? RequirePip { get; set; }
    public List<string>? RequireNodes { get; set; }
    public List<string>? RequireModels { get; set; }
    public ComfyAgentSettings Settings { get; set; }

    public ResponseStatus? ResponseStatus { get; set; }
}

public class GpuInfo
{
    public int Index { get; set; }
    public string Name { get; set; }
    public int Total { get; set; }
    public int Free { get; set; }
    public int Used { get; set; }
}

public class PromptInfo
{
    public string ClientId { get; set; }
    public string? PromptId { get; set; }
    public string ApiPromptUrl { get; set; }
}

[ValidateApiKey]
[Tag(Tags.Agent)]
public class UnRegisterComfyAgent : IPost, IReturn<EmptyResponse>
{
    [ValidateNotEmpty, ValidateExactLength(32)]
    public string DeviceId { get; set; }
}

[ValidateApiKey]
[Tag(Tags.Agent)]
[Route("/comfy/tasks")]
public class GetComfyTasks : IGet, IReturn<ComfyTasksResponse>
{
    [ValidateNotEmpty, ValidateExactLength(32)]
    public string DeviceId { get; set; }
}

public class ComfyTasksResponse
{
    public List<ComfyTask> Results { get; set; } = [];
    public ResponseStatus? ResponseStatus { get; set; }
}

[ValidateApiKey]
[Tag(Tags.Agent)]
public class UpdateWorkflowGeneration : IPost, IReturn<EmptyResponse>
{
    [ValidateNotEmpty]
    public string Id { get; set; } // ClientId

    [ValidateNotEmpty]
    public string DeviceId { get; set; }
    public string? PromptId { get; set; }
    public string? Status { get; set; }
    public string? Outputs { get; set; }
    public int? QueueCount { get; set; }
    public ResponseStatus? Error { get; set; }
}

[ValidateApiKey]
[Tag(Tags.Agent)]
public class CaptionArtifact : IPost, IReturn<EmptyResponse>
{
    [ValidateNotEmpty, ValidateExactLength(32)]
    public string DeviceId { get; set; }
    [ValidateNotEmpty]
    public string ArtifactUrl { get; set; }
    public string? Caption { get; set; }
    public string? Description { get; set; }
}

[ValidateApiKey]
[Tag(Tags.Agent)]
public class CompleteOllamaGenerateTask : OllamaGenerateResponse, IPost, IReturn<EmptyResponse>
{
    [ValidateGreaterThan(0)]
    public long TaskId { get; set; }
}

[ValidateApiKey]
[Tag(Tags.Agent)]
public class GetOllamaGenerateTask : IGet, IReturn<OllamaGenerate>
{
    [ValidateGreaterThan(0)]
    public long TaskId { get; set; }
}

[ValidateApiKey]
[Tag(Tags.Agent)]
public class GetOpenAiChatTask : IGet, IReturn<OpenAiChat>
{
    [ValidateGreaterThan(0)]
    public long TaskId { get; set; }
}

[ValidateApiKey]
[Tag(Tags.Agent)]
public class CompleteOpenAiChatTask : OpenAiChatResponse, IPost, IReturn<EmptyResponse>
{
    [ValidateGreaterThan(0)]
    public long TaskId { get; set; }
}

[ValidateApiKey]
[Tag(Tags.Agent)]
public class AgentData : IGet, IReturn<AgentDataResponse>
{
    [ValidateNotEmpty]
    public string DeviceId { get; set; }
}
public class AgentDataResponse
{
    public List<string> Categories { get; set; }
    public ResponseStatus? ResponseStatus { get; set; }
}

public class ArtifactRef
{
    public int Id { get; set; }
    public AssetType Type { get; set; }
    public string Url { get; set; }
    public long Length { get; set; }
    public string? DeviceId { get; set; }
}

[ValidateApiKey]
[Tag(Tags.Agent)]
public class GetArtifactClassificationTasks : IGet, IReturn<QueryResponse<ArtifactRef>>
{
    [ValidateNotEmpty]
    public string DeviceId { get; set; }
    [Input(Type = "tag", Options = "{ allowableValues: ['Image','Audio','Video'] }")]
    [ValidateNotEmpty]
    public List<AssetType>? Types { get; set; }
    public int? Take { get; set; }
    
    public int? WaitFor { get; set; } 
}

[ValidateApiKey]
[Tag(ServiceModel.Tags.Agent)]
public class CompleteArtifactClassificationTask : IPost, IReturn<EmptyResponse>
{
    [ValidateNotEmpty]
    public string DeviceId { get; set; }
    
    public int ArtifactId { get; set; }
    // Tag => Score
    public Dictionary<string,double>? Tags { get; set; }
    // Category => Score
    public Dictionary<string,double>? Categories { get; set; }
    public List<ObjectDetection>? Objects { get; set; }
    public Ratings? Ratings { get; set; }
    public string? Phash { get; set; }
    public string? Color { get; set; }

    public ResponseStatus? Error { get; set; }
}
