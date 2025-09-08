using System.Runtime.Serialization;
using ServiceStack;
using ServiceStack.DataAnnotations;

namespace MyApp.ServiceModel;

public class ComfyFileRef
{
    public string Path { get; set; }
    public int Size { get; set; }
    public double Modified { get; set; }
}

public enum BaseModel
{
    AuraFlow,

    SDXL,
    [EnumMember(Value = "SD 1.x")]
    SD1,
    [EnumMember(Value = "SD 2.x")]
    SD2,
    [EnumMember(Value = "SD 3")]
    SD3,
    [EnumMember(Value = "SD 3.5")]
    SD35,
    [EnumMember(Value = "SD 3.5 Medium")]
    SD35Medium,
    [EnumMember(Value = "SD 3.5 Large")]
    SD35Large,
    [EnumMember(Value = "SD 3.5 Large Turbo")]
    SD35LargeTurbo,
    [EnumMember(Value = "SDXL Lightning")]
    SDXLLightning,
    StableAudio,
    [EnumMember(Value = "Stable Video Diffusion")]
    SVD,
    [EnumMember(Value = "FLUX.1 Schnell")]
    Flux1S,
    [EnumMember(Value = "Flux.1 Dev")]
    Flux1D,
    [EnumMember(Value = "Flux.1 Kontext")]
    Flux1Kontext,
    HiDream,
    QwenImage,
    Hunyuan1,
    HunyuanVideo,
    Lumina,
    Pony,
    NoobAI,
    Illustrious,
    [EnumMember(Value = "PixArt-α")]
    PixArtA,
    [EnumMember(Value = "PixArt-Σ")]
    PixArtE,
    [EnumMember(Value = "Hunyuan 1.x")]
    Kolors,
    Mochi,
    LTXV,
    CogVideoX,
    [EnumMember(Value = "WanVideo 1.3B")]
    WanVideo13B,
    [EnumMember(Value = "WanVideo 14B")]
    WanVideo14B,
    [EnumMember(Value = "WanVideo 14B 480p")]
    WanVideo14B480p,
    [EnumMember(Value = "WanVideo 14B 720p")]
    WanVideo14B720p,
    Other,
}

public enum ComfyWorkflowType
{
    TextToImage,
    ImageToImage,
    ImageToText,
    TextToAudio,
    TextToVideo,
    TextTo3D,
    AudioToText,
    AudioToAudio,
    VideoToText,
    ImageToVideo,
}

public enum ComfyPrimarySource
{
    Text,
    Image,
    Video,
    Audio,
}

//jq -r 'to_entries[] | .value.input.required // {} | to_entries[] | .value[0] | if type == "array" then "ENUM" else . end' files/object_info.json | sort | uniq
public enum ComfyInputType
{
    Unknown,
    Audio,
    Boolean,
    Clip,
    ClipVision,
    ClipVisionOutput,
    Combo,
    Conditioning,
    ControlNet,
    Enum,
    FasterWhisperModel,
    Filepath,
    Fl2Model,
    Float,
    Floats,
    Gligen,
    Guider,
    Hooks,
    Image,
    Int,
    Latent,
    LatentOperation,
    Load3D,
    Load3DAnimation,
    Mask,
    Mesh,
    Model,
    Noise,
    Photomaker,
    Sampler,
    Sigmas,
    String,
    StyleModel,
    Subtitle,
    TranscriptionPipeline,
    Transcriptions,
    UpscaleModel,
    VAE,
    VHSAudio,
    Voxel,
    WavBytes,
    WavBytesBatch,
    Webcam,
    Video,
}

public class ComfyInputDefinition
{
    public string ClassType { get; set; }
    public int NodeId { get; set; }
    public int ValueIndex { get; set; }
    public string Name { get; set; }
    public string Label { get; set; }
    public ComfyInputType Type { get; set; }
    public string? Tooltip { get; set; }
    public object? Default { get; set; }
    public decimal? Min { get; set; }
    public decimal? Max { get; set; }
    public decimal? Step { get; set; }
    public decimal? Round { get; set; }
    public bool? Multiline { get; set; }
    public bool? DynamicPrompts { get; set; }
    public bool? ControlAfterGenerate { get; set; }
    public bool? Upload { get; set; }
    public string[]? EnumValues { get; set; }
    public Dictionary<string, object>? ComboValues { get; set; }
    public string? Placeholder { get; set; }
}

public class Workflow : AuditBase
{
    [AutoIncrement]
    public int Id { get; set; }
    public string Category { get; set; }
    public string Base { get; set; }
    [Unique]
    public string Name { get; set; }
    [Index(Unique = true)]
    public string Slug { get; set; }
    public string Description { get; set; } // Markdown
    public int? PinVersionId { get; set; }
    public int? ThreadId { get; set; }
    [PgSqlJsonB]
    public List<string>? Tags { get; set; }
}

public class WorkflowVersion : AuditBase
{
    [AutoIncrement]
    public int Id { get; set; }
    [ForeignKey(typeof(Workflow))]
    public int ParentId { get; set; } //ComfyWorkflow.Id
    public string Name { get; set; }    // Version Name
    public string Version { get; set; } // v1
    [Unique]
    public string Path { get; set; }    // Category/Base/Name.Version.json
    [PgSqlJsonB]
    public Dictionary<string,object?> Workflow { get; set; }
    public WorkflowInfo Info { get; set; }
    [IgnoreDataMember]
    [PgSqlJsonB]
    public Dictionary<string, ApiNode>? ApiPrompt { get; set; }
    public List<string> Nodes { get; set; }
    public List<string> Assets { get; set; }
    
    public string PosterImage { get; set; }

    /// <summary>
    /// CodePoint => Count
    /// ['👍','❤','😂','😢'].map(e => e.codePointAt(0)) == [128077, 10084, 128514, 128546]
    /// [128077, 10084, 128514, 128546].map(i => String.fromCodePoint(i))
    /// </summary>
    [PgSqlJsonB]
    public Dictionary<string, long> Reactions { get; set; } = new();
    [Index, Default(0)]
    public int ReactionsCount { get; set; }
}

public class ParsedWorkflow
{
    public string BaseModel { get; set; }
    public string Version { get; set; }
    public string Name => Info.Name;
    public string Category => Info.Type.ToString().Replace("To", " to ");
    public string Path => $"{Category}/{BaseModel}/{Info.Name}.{Version}.json";
    public List<string> Nodes { get; set; }
    public List<string> Assets { get; set; }
    public List<string> RequiresAssets { get; set; }
    public List<string> RequiresCustomNodes { get; set; }
    public List<string> RequiresPipPackages { get; set; }
    public WorkflowInfo Info { get; set; }
    public Dictionary<string,object?> Workflow { get; set; }
    public Dictionary<string, ApiNode>? ApiPrompt { get; set; }
}

public class WorkflowInfo
{
    [References(typeof(WorkflowVersion))]
    public int Id { get; set; }
    [References(typeof(Workflow))]
    public int ParentId { get; set; }
    public string Name { get; set; }
    public ComfyWorkflowType Type { get; set; }
    public ComfyPrimarySource Input { get; set; }
    public ComfyPrimarySource Output { get; set; }
    public List<ComfyInputDefinition> Inputs { get; set; } = [];
    public List<AssetInfo> Assets { get; set; } = [];
    public List<string> CustomNodes { get; set; } = [];
    public List<string> PipPackages { get; set; } = [];
}

public class AssetInfo
{
    public string Asset { get; set; }
    public string Url { get; set; }
}

[DataContract]
public class ApiNode
{
    [DataMember(Name="inputs")]
    public Dictionary<string, object> Inputs { get; set; } = new(); // InputName -> value or [source_node_id, output_index]
    [DataMember(Name="class_type")] public string ClassType { get; set; } = "";
}

[DataContract]
public class ApiPrompt
{
    // Key is the workflow node ID (string)
    [DataMember(Name="prompt")]
    public Dictionary<string, ApiNode> Prompt { get; set; } = new();

    // Other optional properties like extra_data, client_id can be added here
    [DataMember(Name="extra_data")]
    public Dictionary<string, object?>? ExtraData { get; set; }

    [DataMember(Name="client_id")]
    public string? ClientId { get; set; }
}

[UniqueConstraint(nameof(VersionId), nameof(UserId), nameof(Reaction))]
public class WorkflowVersionReaction
{
    [AutoIncrement]
    public int Id { get; set; }
    [Index]
    public int VersionId { get; set; }
    [Index]
    public string UserId { get; set; }
    public Reaction Reaction { get; set; }
    [Default("{SYSTEM_UTC}")]
    public DateTime CreatedDate { get; set; }
}

public class WorkflowGeneration : AuditBase
{
    public string Id { get; set; } // ClientId
    public string? UserId { get; set; }
    /// <summary>
    /// Private Thread Id it belongs to during generation
    /// </summary>
    public int? ThreadId { get; set; } 
    public int WorkflowId { get; set; }
    public int? VersionId { get; set; }
    public AssetType? Output { get; set; }
    public string? Description { get; set; }
    /// <summary>
    /// Defines the base model's weights and architecture.
    /// The base model checkpoint file that determines the core capabilities and style
    /// of image generation. It provides the foundation AI model (like SD 1.5, SDXL, etc.)
    /// </summary>
    public string? Checkpoint { get; set; }
    /// <summary>
    /// LORAs adds specialized capabilities or styles on top of the checkpoint.
    /// A Low-Rank Adaptation file that fine-tunes the base model for specific styles,
    /// subjects, or concepts without changing the entire model
    /// </summary>
    public string? Lora { get; set; }
    /// <summary>
    /// Embeddings enable consistent generation of specific concepts or elements.
    /// A Textual Inversion embedding that teaches the model specific concepts or subjects
    /// using a small set of vectors referenced by a trigger word in prompts
    /// </summary>
    public string? Embedding { get; set; }
    /// <summary>
    /// VAEs converts between the model's latent representation and the actual image.
    /// The Variational Autoencoder component responsible for encoding/decoding between 
    /// latent space and pixel space. It determines the final image quality and detail.
    /// </summary>
    public string? Vae { get; set; }
    /// <summary>
    /// Control Nets provide precise control over composition, structure, and layout of generated images.
    /// They're a specialized model that allows for conditional control over the image generation process
    /// by accepting additional inputs like depth maps, edge detection, pose estimation, etc.
    /// </summary>
    public string? ControlNet { get; set; }
    /// <summary>
    /// Upscalers improves final image quality by intelligently scaling low-resolution outputs to higher resolutions.
    /// Upscale models are specifically designed to increase the resolution of generated images
    /// while preserving or enhancing details and reducing artifacts
    /// </summary>
    public string? Upscaler { get; set; }
    /// <summary>
    /// Image preview to use for this generation
    /// </summary>
    public string? PosterImage { get; set; }
    public Dictionary<string,object?>? Args { get; set; }
    [IgnoreDataMember]
    public Dictionary<string,object?> Workflow { get; set; }
    [IgnoreDataMember]
    public ApiPrompt ApiPrompt { get; set; }
    public List<string>? Inputs { get; set; }
    public HashSet<string> RequiredNodes { get; set; }
    public HashSet<string> RequiredAssets { get; set; }
    public string? DeviceId { get; set; }
    public string? PromptId { get; set; }
    [IgnoreDataMember]
    public Dictionary<string,object?>? Status { get; set; }
    [IgnoreDataMember]
    public Dictionary<string,object?>? Outputs { get; set; }
    public WorkflowResult? Result { get; set; }
    public ResponseStatus? Error { get; set; }
    public int Credits { get; set; }
    public string? StatusUpdate { get; set; }
    public string? PublishedBy { get; set; }
    [Index]
    public DateTime? PublishedDate { get; set; }
    /// <summary>
    /// Thread Id used for public comments
    /// </summary>
    public int? PublicThreadId { get; set; } 
    
    [Ignore] public string? UserName { get; set; }
    [Ignore] public int? UserKarma { get; set; }
}

public static class GenerationStatus
{
    public const string InAgentsPool = "In agents pool";
    public const string AssignedToAgent = "Assigned to agent";
    public const string GenerationStarted = "Generation started";
    public const string GenerationExecuted = "Generation executed";
    public const string GenerationCompleted = "Generation completed";
    public const string GenerationFailed = "Generation failed";
    public const string ReAddedToAgentsPool = "Re-added to agents pool";
    public const string CallbackFailed = "Callback failed";
}

public class Artifact : AuditBase, IAssetMetadata
{
    [AutoIncrement]
    public int Id { get; set; }
    public string GenerationId { get; set; }
    public AssetType Type { get; set; }
    [IgnoreDataMember] // Not important
    public string FileName { get; set; }
    public string Url { get; set; }
    public long Length { get; set; }
    [IgnoreDataMember] // In URL
    public string? Hash { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    [CustomSelect("\"Width\" * \"Height\"")]
    public int? Resolution { get; set; }
    public int? VersionId { get; set; }
    public int? WorkflowId { get; set; }
    public int? ThreadId { get; set; }
    public int? Credits { get; set; }
    [Index]
    public Rating? Rating { get; set; }
    public Ratings? Ratings { get; set; }
    // Tag => Score
    [PgSqlJsonB]
    public Dictionary<string,double>? Tags { get; set; }
    // Category => Score
    [PgSqlJsonB]
    public Dictionary<string,double>? Categories { get; set; }
    /// <summary>
    /// CodePoint => Count
    /// ['👍','❤','😂','😢'].map(e => e.codePointAt(0)) == [128077, 10084, 128514, 128546]
    /// [128077, 10084, 128514, 128546].map(i => String.fromCodePoint(i))
    /// </summary>
    [PgSqlJsonB]
    public Dictionary<string, long> Reactions { get; set; } = new();
    [Index, Default(0)]
    public int ReactionsCount { get; set; }
    
    [IgnoreDataMember] // In URL
    public List<ObjectDetection>? Objects { get; set; }
    public string? Phash { get; set; }
    public string? Color { get; set; }
    public string? Caption { get; set; }
    public string? Description { get; set; }
    
    public AudioInfo? Audio { get; set; }
    public string? PublishedBy { get; set; }
    [Index]
    public DateTime? PublishedDate { get; set; }
    
    public int? VariantId { get; set; }
    
    public string? VariantName { get; set; }
    public string? DeviceId { get; set; }
    public ResponseStatus? Error { get; set; }
    
    [Ignore] public string? UserName { get; set; }
    [Ignore] public int? UserKarma { get; set; }
}

public class WorkflowResult
{
    public string? ClientId { get; set; }
    public TimeSpan? Duration { get; set; }
    public List<ComfyTextOutput>? Texts { get; set; }
    public List<ComfyAssetOutput>? Assets { get; set; }
}
public class ComfyTextOutput
{
    public string NodeId { get; set; }
    public string? Text { get; set; }
}

public interface IAssetMetadata
{
    public Ratings? Ratings { get; set; }
    public Dictionary<string, double>? Tags { get; set; }
    public Dictionary<string, double>? Categories { get; set; }
    public List<ObjectDetection>? Objects { get; set; }
}

public class ComfyAssetOutput : IAssetMetadata
{
    public string NodeId { get; set; }
    public string Url { get; set; }
    public AssetType Type { get; set; }
    public string FileName { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public int? Length { get; set; }
    public Rating? Rating { get; set; }
    public Ratings? Ratings { get; set; }
    public Dictionary<string, double>? Tags { get; set; }
    public Dictionary<string, double>? Categories { get; set; }
    public List<ObjectDetection>? Objects { get; set; }
    public string? Phash { get; set; }
    public string? Color { get; set; }
    
    // Audio
    public string? Codec { get; set; }
    public double? Duration { get; set; }
    public int? Bitrate { get; set; }
    public int? Streams { get; set; }
    public int? Programs { get; set; }
}

public class AudioInfo
{
    public string? Codec { get; set; }
    public double? Duration { get; set; }
    public int? Length { get; set; }
    public int? Bitrate { get; set; }
    public int? Streams { get; set; }
    public int? Programs { get; set; }
}

public class ArtifactMetadata : IAssetMetadata
{
    public string? FileName { get; set; }
    public long? Created { get; set; }
    public Ratings? Ratings { get; set; }
    public Dictionary<string, double>? Categories { get; set; }
    public Dictionary<string, double>? Tags { get; set; }
    public List<ObjectDetection>? Objects { get; set; }
    public string? Phash { get; set; }
    public string? Color { get; set; }
    public string? Caption { get; set; }
    public string? Description { get; set; }
}

public class Ratings
{
    [DataMember(Name="predicted_rating")]
    public string PredictedRating { get; set; }
    public double Confidence { get; set; }
    [DataMember(Name="all_scores")]
    public Dictionary<string, double> AllScores { get; set; }
}

public class ObjectDetection
{
    public string? Model { get; set; }
    public string Class { get; set; }
    public double Score { get; set; }
    public int[] Box { get; set; }
}

public enum AssetType
{
    Image,
    Video,
    Audio,
    Animation,
    Text,
    Binary,
}

//[Flags] store as strings but allow bitwise operations
public enum Rating
{
    PG,
    [EnumMember(Value="PG-13")]
    PG13,
    M,
    R,
    X,
    XXX,
}