using System.Runtime.Serialization;
using ServiceStack.DataAnnotations;
using ServiceStack.OrmLite;

namespace MyApp.Migrations;

public class Migration1001 : MigrationBase
{
    public class ComfyAgent
    {
        [AutoIncrement] public int Id { get; set; }
        [Index]
        public string DeviceId { get; set; }
        public int Version { get; set; }
        public string? ComfyVersion { get; set; }
        [Index]
        public string UserId { get; set; }
        public string? UserName { get; set; }
        public string ApiKey { get; set; }
        public List<GpuInfo>? Gpus { get; set; }
        public List<string> Workflows { get; set; }
        public List<string> Nodes { get; set; }

        public Dictionary<string, List<string>> Models { get; set; } = new();
        public List<string>? LanguageModels { get; set; }
        public bool Enabled { get; set; }
        public DateTime? OfflineDate { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime ModifiedDate { get; set; }
        public string? LastIp { get; set; }
    
        public int Credits { get; set; }
        public int WorkflowsExecuted { get; set; }
        public int ImagesGenerated { get; set; }
        public int AudiosGenerated { get; set; }
        public int VideosGenerated { get; set; }
        public int TextsGenerated { get; set; }
    
        public int QueueCount { get; set; }
    
        [PgSqlJsonB]
        public List<string>? RequirePip { get; set; }
        [PgSqlJsonB]
        public List<string>? RequireNodes { get; set; }
        [PgSqlJsonB]
        public List<string>? RequireModels { get; set; }

        [PgSqlJsonB]
        public List<string>? InstalledPip { get; set; }
        [PgSqlJsonB]
        public List<string>? InstalledNodes { get; set; }
        [PgSqlJsonB]
        public List<string>? InstalledModels { get; set; }
        [PgSqlJsonB]
        public Dictionary<string, ModelSettings>? ModelSettings { get; set; }

        [PgSqlJsonB]
        public ComfyAgentConfig Config { get; set; }

        [PgSqlJsonB]
        public ComfyAgentSettings Settings { get; set; }

        public string? Status { get; set; }
        public string? Logs { get; set; }
        public ResponseStatus? Error { get; set; }
        public DateTime? DevicePool { get; set; }
    }
    
    public class Asset
    {
        [AutoIncrement]
        public int Id { get; set; }
        public string Name { get; set; }
        public string? Type { get; set; }
        public string? Base { get; set; }
        [DataMember(Name = "save_path")]
        public string SavePath { get; set; }
        [DataMember(Name = "filename")]
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

    public class ModelSettings {}
    public class GpuInfo {}
    public class ComfyAgentConfig {}
    public class ComfyAgentSettings {}
    
    public override void Up()
    {
        Db.CreateTable<ComfyAgent>();
        Db.CreateTable<Asset>();
    }

    public override void Down()
    {
        Db.DropTable<Asset>();
        Db.DropTable<ComfyAgent>();
    }
}
