using System.Runtime.Serialization;
using ServiceStack.DataAnnotations;
using ServiceStack.OrmLite;

namespace MyApp.Migrations;

public class Migration1004 : MigrationBase
{
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

    public class DeletedRow
    {
        [AutoIncrement]
        public int Id { get; set; }
        public Table Table { get; set; }
        public string Key { get; set; }
    }
    
    [Flags]
    public enum Table {}

    [Flags]
    public enum Reaction {}
    public enum Rating {}
    public enum ReportType {}
    public enum ReportTag {}
    public enum ModerationDecision {}
    
    public override void Up()
    {
        Db.CreateTable<ModerationQueue>();
        Db.CreateTable<HiddenArtifact>();
        Db.CreateTable<ArtifactTag>();
        Db.CreateTable<Tag>();
        Db.CreateTable<ArtifactReaction>();
        Db.CreateTable<Category>();
        Db.CreateTable<ArtifactCategory>();
        Db.CreateTable<DeletedRow>();
    }

    public override void Down()
    {
        Db.DropTable<DeletedRow>();
        Db.DropTable<Category>();
        Db.DropTable<ArtifactCategory>();
        Db.DropTable<ArtifactReaction>();
        Db.DropTable<Tag>();
        Db.DropTable<ArtifactTag>();
        Db.DropTable<HiddenArtifact>();
        Db.DropTable<ModerationQueue>();
    }
}