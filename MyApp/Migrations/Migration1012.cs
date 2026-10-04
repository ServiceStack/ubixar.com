using ServiceStack.DataAnnotations;
using ServiceStack.OrmLite;
namespace MyApp.Migrations;

public class Migration1012 : MigrationBase
{
    [CompositeIndex(nameof(DecisionId), nameof(UserId), Unique = true)]
    public class DecisionStar
    {
        [AutoIncrement] public long Id { get; set; }
        [Index] public long DecisionId { get; set; }
        [Index] public string UserId { get; set; } = "";
    }
    public override void Up() => Db.CreateTable<DecisionStar>();
    public override void Down() => Db.DropTable<DecisionStar>();
}
