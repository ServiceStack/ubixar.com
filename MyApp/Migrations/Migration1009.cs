using System.Runtime.Serialization;
using ServiceStack.DataAnnotations;
using ServiceStack.OrmLite;

namespace MyApp.Migrations;

public class Migration1009 : MigrationBase
{
    /*
       CREATE TABLE "thread"
       (
           id            INTEGER primary key autoincrement,
           user          TEXT,
           createdAt     TIMESTAMP default CURRENT_TIMESTAMP,
           updatedAt     TIMESTAMP default CURRENT_TIMESTAMP,
           title         TEXT,
           systemPrompt  TEXT,
           model         TEXT,
           modelInfo     JSON,
           modalities    JSON,
           messages      JSON,
           args          JSON,
           tools         JSON,
           cost          REAL,
           inputTokens   INTEGER,
           outputTokens  INTEGER,
           stats         JSON,
           provider      TEXT,
           providerModel TEXT,
           publishedAt   TIMESTAMP,
           startedAt     TIMESTAMP,
           completedAt   TIMESTAMP,
           error         TEXT,
           ref           TEXT,
           metadata      JSON, 
           toolHistory   JSON, 
           providerResponse JSON, 
           contextTokens INTEGER, 
           parentId      INTEGER, 
           status        TEXT)
    */
    
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
        public int? GalleryScore { get; set; }
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
        public string? Caption { get; set; }
        public string? Description { get; set; }
        public string? Phash { get; set; }
        public string? Color { get; set; }
        // Category => Score
        [PgSqlJsonB]
        public Dictionary<string,double>? Categories { get; set; }
        [PgSqlJsonB]
        public Dictionary<string,double>? Tags { get; set; }
        public Rating? Rating { get; set; }
        [PgSqlJsonB]
        public Ratings? Ratings { get; set; }
        [PgSqlJsonB]
        public List<ObjectDetection>? Objects { get; set; }
        public DateTime? Published { get; set; }
        [PgSqlJsonB]
        public Dictionary<string,object>? Metadata { get; set; }
        public string? VariantId { get; set; }
        public string? VariantName { get; set; }
        public string? DeviceId { get; set; }
        public ResponseStatus? Error { get; set; }
        
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
        public int? GalleryScore { get; set; }
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
        public int? GalleryScore { get; set; }
        public string? PosterImage { get; set; }
    }

    public class Ratings {}
    public class ObjectDetection {}
    public enum Rating {}
    public enum AssetType {}
    
    public override void Up()
    {
        Db.CreateTable<PublishedThread>();
        Db.CreateTable<PublishedMedia>();
        Db.CreateTable<PublishedProject>();
    }
 
    public override void Down()
    {
        Db.DropTable<PublishedProject>();
        Db.DropTable<PublishedMedia>();
        Db.DropTable<PublishedThread>();
    }
}
