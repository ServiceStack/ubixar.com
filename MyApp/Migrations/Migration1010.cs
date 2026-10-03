using ServiceStack.DataAnnotations;
using ServiceStack.OrmLite;
namespace MyApp.Migrations;

public class Migration1010 : MigrationBase
{
    [Alias("PublishedRecipe")]
    [CompositeIndex(nameof(PublishedBy), nameof(CreateIdempotencyKey), Unique = true)]
    public class PublishedDecision
    {
        [AutoIncrement] public long Id { get; set; }
        [Unique] public string ExternalRef { get; set; } = "";
        [Index] public string PublishedBy { get; set; } = "";
        public string Filename { get; set; } = "";
        public int SchemaVersion { get; set; }
        [StringLength(StringLengthAttribute.MaxText)] public string DocumentJson { get; set; } = "";
        public string RecipeHash { get; set; } = "";
        [StringLength(StringLengthAttribute.MaxText)] public string ExecutionJson { get; set; } = "";
        public string ContentHash { get; set; } = "";
        public string ExecutedModel { get; set; } = "";
        public DateTime ExecutedAt { get; set; }
        public string Name { get; set; } = "";
        [StringLength(StringLengthAttribute.MaxText)] public string Description { get; set; } = "";
        [StringLength(StringLengthAttribute.MaxText)] public string Tags { get; set; } = "[]";
        public int QuestionCount { get; set; }
        public int FieldCount { get; set; }
        public int ExampleCount { get; set; }
        public int Revision { get; set; }
        public DateTime PublishedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? UnpublishedAt { get; set; }
        public string CreateIdempotencyKey { get; set; } = "";
        public string CreateRequestHash { get; set; } = "";
    }

    public override void Up() => Db.CreateTable<PublishedDecision>();
    public override void Down() => Db.DropTable<PublishedDecision>();
}
