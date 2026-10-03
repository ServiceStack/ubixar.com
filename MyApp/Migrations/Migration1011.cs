using ServiceStack.DataAnnotations;
using ServiceStack.OrmLite;
namespace MyApp.Migrations;

public class Migration1011 : MigrationBase
{
    [Alias("PublishedRecipe")]
    public class PublishedDecision
    {
        [Default(typeof(bool), "false")] public bool PublisherStarred { get; set; }
        [Default(0)] public int PublisherRunCount { get; set; }
    }
    public override void Up()
    {
        Db.AddColumn<PublishedDecision>(x => x.PublisherStarred);
        Db.AddColumn<PublishedDecision>(x => x.PublisherRunCount);
    }
    public override void Down()
    {
        Db.DropColumn<PublishedDecision>(x => x.PublisherRunCount);
        Db.DropColumn<PublishedDecision>(x => x.PublisherStarred);
    }
}
