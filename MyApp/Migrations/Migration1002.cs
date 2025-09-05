using System.Runtime.Serialization;
using ServiceStack.DataAnnotations;
using ServiceStack.OrmLite;

namespace MyApp.Migrations;

public class Migration1002 : MigrationBase
{
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
        public int ParentId { get; set; }   // ComfyWorkflow.Id
        public string Name { get; set; }    // Version Name
        public string Version { get; set; } // v1
        [Unique]
        public string Path { get; set; }    // Category/Base/Name.Version.json
        [PgSqlJsonB]
        public Dictionary<string,object?> Workflow { get; set; }
        public ComfyWorkflowInfo Info { get; set; }
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
        public int? ThreadId { get; set; } 
        public int WorkflowId { get; set; }
        public int? VersionId { get; set; }
        public string? Description { get; set; }
        public AssetType? Output { get; set; }
        public string? Checkpoint { get; set; }
        public string? Lora { get; set; }
        public string? Embedding { get; set; }
        public string? Vae { get; set; }
        public string? ControlNet { get; set; }
        public string? Upscaler { get; set; }
        public string? PosterImage { get; set; }
        public Dictionary<string,object?>? Args { get; set; }
        public Dictionary<string,object?> Workflow { get; set; }
        public ApiPrompt ApiPrompt { get; set; }
        public List<string>? Inputs { get; set; }
        public HashSet<string> RequiredNodes { get; set; }
        public HashSet<string> RequiredAssets { get; set; }
        public string? DeviceId { get; set; }
        public string? PromptId { get; set; }
        public Dictionary<string,object?>? Status { get; set; }
        public Dictionary<string,object?>? Outputs { get; set; }
        public ComfyResult? Result { get; set; }
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
    }
    
    public class Artifact : AuditBase
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
        // CodePoint => Count
        [PgSqlJsonB]
        public Dictionary<long, long> Reactions { get; set; } = new();
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
    }
    
    public enum AssetType {}
    [Flags]
    public enum Reaction {}
    public enum Rating {}
    public class ComfyWorkflowInfo {}
    public class ApiPrompt {}
    public class ComfyResult {}
    public class Ratings {}
    public class ObjectDetection {}
    public class ApiNode {}
    public class AudioInfo {}

    public override void Up()
    {
        Db.CreateTable<Workflow>();
        Db.CreateTable<WorkflowVersion>();
        Db.CreateTable<WorkflowVersionReaction>();
        Db.CreateTable<WorkflowGeneration>();
        Db.CreateTable<Artifact>();
    }

    public override void Down()
    {
        Db.DropTable<Artifact>();
        Db.DropTable<WorkflowGeneration>();
        Db.DropTable<WorkflowVersionReaction>();
        Db.DropTable<WorkflowVersion>();
        Db.DropTable<Workflow>();
    }
}
