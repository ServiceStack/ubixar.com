using System.Runtime.Serialization;
using ServiceStack;
using ServiceStack.DataAnnotations;

namespace MyApp.ServiceModel;

public class PublishedThread
{
    [AutoIncrement]
    public int Id { get; set; }
    public string? User { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string Title { get; set; }
    public string? SystemPrompt { get; set; }
    public string Model { get; set; }
    [PgSqlJsonB]
    public Dictionary<string,object>? ModelInfo { get; set; }
    [PgSqlJsonB]
    public Dictionary<string,object>? Modalities { get; set; }
    [PgSqlJsonB]
    public List<object> Messages { get; set; }
    [PgSqlJsonB]
    public Dictionary<string,object>? Args { get; set; }
    [PgSqlJsonB]
    public Dictionary<string,object>? Tools { get; set; }
    public double Cost { get; set; }
    public int InputTokens { get; set; }
    public int OutputTokens { get; set; }
    [PgSqlJsonB]
    public Dictionary<string,object>? Stats { get; set; }
    public string? Provider { get; set; }
    public string? ProviderModel { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? Error { get; set; }
    public string? Ref { get; set; }
    [PgSqlJsonB]
    public Dictionary<string,object>? Metadata { get; set; }
    [PgSqlJsonB]
    public Dictionary<string,object>? ToolHistory { get; set; }
    [PgSqlJsonB]
    public Dictionary<string,object>? ProviderResponse { get; set; }
    public int ContextTokens { get; set; }
    public int? ParentId { get; set; }
    public string? Status { get; set; }
    [Unique]
    public string MessagesHash { get; set; } // hash of messages json
    public string ExternalRef { get; set; } // Unique timestamp-based reference
    public int? RemoteId { get; set; }
    [IgnoreDataMember]
    public string? RemoteIp { get; set; }
    public string PublishedBy { get; set; }
    public DateTime PublishedAt { get; set; }
    public string PublishedUrl { get; set; }
    /// <summary>
    /// Thread Id used for public comments
    /// </summary>
    public int? PublicThreadId { get; set; } 
}

public class PublishedMedia
{
    [AutoIncrement]
    public int Id { get; set; }
    public string Name { get; set; }
    [Index]
    public AssetType Type { get; set; }
    public string? Prompt { get; set; }
    public string? Model { get; set; }
    public DateTime Created { get; set; }
    public double Cost { get; set; }
    public int? Seed { get; set; }
    public string Url { get; set; }
    public string Hash { get; set; }
    public string? AspectRatio { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public int? Size { get; set; }
    public int? Duration { get; set; }
    public string? User { get; set; }
    [PgSqlJsonB]
    public Dictionary<string,object>? Reactions { get; set; }
    public string? Caption { get; set; }
    public string? Description { get; set; }
    public string? Phash { get; set; }
    public string? Color { get; set; }
    [PgSqlJsonB]
    public Dictionary<string,object>? Category { get; set; }
    [PgSqlJsonB]
    public List<string>? Tags { get; set; }
    public string? Rating { get; set; }
    [PgSqlJsonB]
    public Dictionary<string,object>? Ratings { get; set; }
    [PgSqlJsonB]
    public List<object>? Objects { get; set; }
    public DateTime? Published { get; set; }
    [PgSqlJsonB]
    public Dictionary<string,object>? Metadata { get; set; }
    public string? VariantId { get; set; }
    public string? VariantName { get; set; }
    
    public string ExternalRef { get; set; } // Unique timestamp-based reference
    [IgnoreDataMember]
    public int? RemoteId { get; set; }
    [IgnoreDataMember]
    public string? RemoteIp { get; set; }
    [Index]
    public string PublishedBy { get; set; }
    public DateTime PublishedAt { get; set; }
    public string PublishedUrl { get; set; }
    /// <summary>
    /// Thread Id used for public comments
    /// </summary>
    public int? PublicThreadId { get; set; } 
}

public class PublishedProject
{
    [AutoIncrement]
    public int Id { get; set; }
    public string Name { get; set; }
    public string Description { get; set; }
    [PgSqlJsonB]
    public List<string>? Paths { get; set; }
    public long Size { get; set; }
    public long FileCount { get; set; }
                
    public string ExternalRef { get; set; } // Unique timestamp-based reference
    [IgnoreDataMember]
    public int? RemoteId { get; set; }
    [IgnoreDataMember]
    public string? RemoteIp { get; set; }
    [Index]
    public string PublishedBy { get; set; }
    public DateTime PublishedAt { get; set; }
    public string PublishedUrl { get; set; }
    /// <summary>
    /// Thread Id used for public comments
    /// </summary>
    public int? PublicThreadId { get; set; }
}

[Tag(Tags.Publish)]
[ValidateApiKey]
[SystemJson(UseSystemJson.Never)]
[Route("/publish/thread", "POST")]
public class PublishThread : IPost, IReturn<PublishThreadResponse>
{
    public int Id { get; set; }
    [ValidateNotEmpty]
    public string Title { get; set; }
    [ValidateNotEmpty]
    public string Model { get; set; }
    public Dictionary<string,object>? ModelInfo { get; set; }
    [ValidateNotNull]
    public List<object> Messages { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? User { get; set; }
    public string? SystemPrompt { get; set; }
    public Dictionary<string,object>? Modalities { get; set; }
    public Dictionary<string,object>? Args { get; set; }
    public Dictionary<string,object>? Tools { get; set; }
    public double Cost { get; set; }
    public int InputTokens { get; set; }
    public int OutputTokens { get; set; }
    public Dictionary<string,object>? Stats { get; set; }
    public string? Provider { get; set; }
    public string? ProviderModel { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? Error { get; set; }
    public string? Ref { get; set; }
    public Dictionary<string,object>? Metadata { get; set; }
    public Dictionary<string,object>? ToolHistory { get; set; }
    public Dictionary<string,object>? ProviderResponse { get; set; }
    public int ContextTokens { get; set; }
    public int? ParentId { get; set; }
    public string? Status { get; set; }
}

public class PublishThreadResponse
{
    public string PublishedUrl { get; set; }
    public ResponseStatus? ResponseStatus { get; set; }
}

[Tag(Tags.Publish)]
[Route("/t/{ExternalRef}", "GET")]
public class ViewPublishedThread : IGet, IReturn<string>
{
    [ValidateNotEmpty]
    public string ExternalRef { get; set; } // hash of messages json
}

[Tag(Tags.Publish)]
[ValidateApiKey]
[Route("/publish/avatar/{Profile}", "POST")]
public class PublishAvatar : IPost, IReturn<PublishAvatarResponse>
{
    [ValidateNotEmpty]
    public string Profile { get; set; }
}
public class PublishAvatarResponse
{
    public string PublishedUrl { get; set; }
    public ResponseStatus? ResponseStatus { get; set; }
}

[Tag(Tags.Publish)]
[Route("/publish/avatar/{User}/{Profile}", "GET")]
public class GetPublishedAvatar : IGet, IReturn<byte[]>
{
    [ValidateNotEmpty]
    public string User { get; set; }
    [ValidateNotEmpty]
    public string Profile { get; set; }
    public string? Theme { get; set; }
}

[Tag(Tags.Publish)]
[ValidateApiKey]
[Route("/publish/cache", "POST")]
public class PublishToCache : IPost, IReturn<PublishToCacheResponse>
{
}
public class PublishToCacheResponse
{
    public Dictionary<string,string> PublishedUrls { get; set; }
    public ResponseStatus? ResponseStatus { get; set; }
}

[Tag(Tags.Publish)]
[Route("/cache/{**Path}")]
public class GetCacheFile : IGet, IReturn<byte[]>
{
    [ValidateNotEmpty]
    public string Path { get; set; } = null!;
    public bool? Download { get; set; }
}

[Tag(Tags.Publish)]
[ValidateApiKey]
[Route("/publish/project/{Name}", "POST")]
public class PublishProject : IPost, IReturn<PublishProjectResponse>
{
    public string Name { get; set; }
}
public class PublishProjectResponse
{
    public string PublishedUrl { get; set; }
    public ResponseStatus? ResponseStatus { get; set; }
}

[Tag(Tags.Publish)]
[Route("/p/{UserName}/{ProjectName}/{**Path}", "GET")]
public class GetPublishedProjectFile : IGet, IReturn<byte[]>
{
    public string UserName { get; set; }
    public string ProjectName { get; set; }
    public string Path { get; set; }
    public bool? Original { get; set; }
}

[Tag(Tags.Publish)]
[ValidateApiKey]
[Route("/publish/media", "POST")]
public class PublishMedia : IPost, IReturn<PublishMediaResponse>
{
}
public class PublishMediaResponse
{
    public string PublishedUrl { get; set; }
    public ResponseStatus? ResponseStatus { get; set; }
}

[Tag(Tags.Publish)]
[Route("/m/{ExternalRef}", "GET")]
public class ViewPublishedMedia : IGet, IReturn<string>
{
    [ValidateNotEmpty]
    public string ExternalRef { get; set; } // hash of messages json
}

public enum PublishType
{
    Thread,
    Project,
    Media,
}
