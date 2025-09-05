using System.Runtime.Serialization;
using MyApp.ServiceInterface;
using ServiceStack.DataAnnotations;
using ServiceStack.OrmLite;

namespace MyApp.Migrations;

public class Migration1008 : MigrationBase
{
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
        public string ModifiedBy { get; set; }
        public DateTime ModifiedDate { get; set; }
    }

    public class User
    {
        [PrimaryKey]
        public string Id { get; set; } // 1:1 with AspNetUsers/ApplicationUser.Id
        public string UserName { get; set; }
        [PgSqlJsonB]
        public List<Rating> Ratings { get; set; }
        public string? ProfileUrl { get; set; }
        [PgSqlJsonB]
        public UserPrefs Prefs { get; set; } = new();
        public int Karma { get; set; }
        public int Credits { get; set; }
        public QuotaTier QuotaTier { get; set; }
        public DateTime? LastBonusDate { get; set; }
        public DateTime ModifiedDate { get; set; }
    }
    public class UserPrefs {}
    public class CreditLog
    {
        [AutoIncrement]
        public int Id { get; set; }
        [Index]
        public string UserId { get; set; }
        public int Credits { get; set; }
        public CreditReason? Reason { get; set; }
        public string? Description { get; set; }
        public string? RefId { get; set; }
        public string? RefUserId { get; set; }
        public DateTime CreatedDate { get; set; }
    }
    public enum CreditReason {}
    
    public class Achievement
    {
        [AutoIncrement]
        public int Id { get; set; }
        [Index] public string UserId { get; set; }
        public AchievementType Type { get; set; }
        public string? Title { get; set; }
        public string? GenerationId { get; set; }
        public int? ArtifactId { get; set; }
        public string? RefId { get; set; }
        public string? RefUserId { get; set; }
        public int Score { get; set; }
        public DateTime CreatedDate { get; set; }
    }

    [EnumAsInt]
    public enum AchievementType
    {
        Unknown = 0,
        PublishedGeneration = 1,
        ArtifactReaction = 2,
        CommentReaction = 3,
    }

    public class Notification
    {
        [AutoIncrement]
        public int Id { get; set; }
        [Index]
        public string UserId { get; set; }
        public NotificationType Type { get; set; }
        public string? GenerationId { get; set; }
        public int? ArtifactId { get; set; }
        public string RefId { get; set; } // Comment
        public string Summary { get; set; } //100 chars
        public DateTime CreatedDate { get; set; }
        public string? Href { get; set; }
        public string? Title { get; set; } //100 chars
        public string? RefUserId { get; set; }
    }

    [Flags, EnumAsInt]
    public enum NotificationType
    {
        Unknown = 0,
        NewComment = 1,
        CommentMention = 2,
        NewBadge = 3,
    }

    public enum Rating
    {
        PG    = 1 << 0,
        PG13  = 1 << 1,
        M     = 1 << 2,
        R     = 1 << 3,
        X     = 1 << 4,
        XXX   = 1 << 5,
    }
    public enum QuotaTier
    {
    }
    
    public class GenerationInfo
    {
        public string Id { get; set; }
        public string Description { get; set; }
        public string UserId { get; set; }
        public DateTime PublishedDate { get; set; }
    }

    public class ReactionInfo
    {
        public int Id { get; set; }
        public string? Title { get; set; }
        public string GenerationId { get; set; }
        public int ArtifactId { get; set; }
        public string UserId { get; set; }
        public DateTime CreatedDate { get; set; }
    }

    public override void Up()
    {
        Db.CreateTable<Document>();
        Db.CreateTable<Achievement>();
        Db.CreateTable<Notification>();
        Db.CreateTable<CreditLog>();
        Db.CreateTable<User>();
        
        // Update the reactions count for the affected Artifact(s)
        Db.ExecuteNonQuery(
            """
            CREATE OR REPLACE FUNCTION update_user_karma()
            RETURNS TRIGGER AS $$
            DECLARE
                affected_user_id TEXT;
            BEGIN
                -- Determine which user's karma needs to be updated
                IF TG_OP = 'DELETE' THEN
                    affected_user_id := OLD."UserId";
                ELSE
                    affected_user_id := NEW."UserId";
                END IF;

                -- Update the user's karma by summing all their achievement scores
                UPDATE "User"
                SET "Karma" = COALESCE((
                    SELECT SUM("Score")
                    FROM "Achievement"
                    WHERE "UserId" = affected_user_id
                ), 0)
                WHERE "Id" = affected_user_id;

                RETURN COALESCE(NEW, OLD);
            END;
            $$ LANGUAGE plpgsql;
            """);
        Db.ExecuteNonQuery(
            """
            CREATE OR REPLACE TRIGGER update_user_karma_trigger
            AFTER INSERT OR UPDATE OR DELETE ON "Achievement"
            FOR EACH ROW
            EXECUTE PROCEDURE update_user_karma();
            """);

        // Recalculate User Credits from the CreditLog
        Db.ExecuteNonQuery(
            """
            CREATE OR REPLACE FUNCTION update_user_credits()
            RETURNS TRIGGER AS $$
            DECLARE
                affected_user_id TEXT;
            BEGIN
                -- Determine which user's credits need to be updated
                IF TG_OP = 'DELETE' THEN
                    affected_user_id := OLD."UserId";
                ELSE
                    affected_user_id := NEW."UserId";
                END IF;

                -- Update the user's credits by calculating from CreditLog
                UPDATE "User"
                SET
                    "Credits" = COALESCE((
                        SELECT SUM("Credits")
                        FROM "CreditLog"
                        WHERE "UserId" = affected_user_id
                    ), 0),
                    "ModifiedDate" = CURRENT_TIMESTAMP
                WHERE "Id" = affected_user_id;

                RETURN COALESCE(NEW, OLD);
            END;
            $$ LANGUAGE plpgsql;
            """);
        Db.ExecuteNonQuery(
            """
            CREATE OR REPLACE TRIGGER update_user_credits
            AFTER INSERT OR UPDATE OR DELETE ON "CreditLog"
            FOR EACH ROW
            EXECUTE PROCEDURE update_user_credits();
            """);
        
        var users = Db.Select<Data.ApplicationUser>();
        var generations = Db.Select<GenerationInfo>(
            Db.From<ServiceModel.WorkflowGeneration>()
                .Where(x => x.UserId != null && x.UserId != AppConfig.Instance.DefaultUserId && x.PublishedDate != null)
                .Select(x => new { x.Id, x.UserId, x.Description, x.PublishedDate }));
        var generationsLookup = generations.ToLookup(x => x.UserId);
        var artifactReactions = Db.Select<ReactionInfo>(
            Db.From<ServiceModel.ArtifactReaction>()
                .Join<ServiceModel.Artifact>((ar,a) => a.Id == ar.ArtifactId)
                .Where(x => x.UserId != AppConfig.Instance.DefaultUserId)
                .Select<ServiceModel.ArtifactReaction,ServiceModel.Artifact>((ar,a) => new {
                    ar.Id,
                    Title = a.Caption ?? a.Description,
                    a.GenerationId,
                    ar.ArtifactId,
                    ar.UserId,
                    ar.CreatedDate,
                }));
        var artifactReactionsLookup = artifactReactions.ToLookup(x => x.GenerationId);
        var artifactAchievementHashes = new HashSet<string>();
        
        foreach (var user in users)
        {
            var userName = user.UserName ?? throw new ArgumentNullException(nameof(User.UserName), $"{user.Id} {user.Email}"); 
            Db.Insert(new User
            {
                Id = user.Id,
                Ratings = user.Ratings?.Split(',').Map(x => (Rating)Enum.Parse(typeof(Rating), x)) ?? [],
                UserName = userName,
                ProfileUrl = user.ProfileUrl,
                Credits = 0,
                ModifiedDate = DateTime.UtcNow,
            });
            
            var userGenerations = generationsLookup[user.Id]
                .OrderBy(x => x.PublishedDate);
            foreach (var generation in userGenerations)
            {
                Db.Insert(new Achievement
                {
                    UserId = user.Id,
                    Type = AchievementType.PublishedGeneration,
                    Title = generation.Description.AchievementTitle(),
                    GenerationId = generation.Id,
                    CreatedDate = generation.PublishedDate,
                    Score = 2,
                });

                var userArtifactReactions = artifactReactionsLookup[generation.Id];
                foreach (var reaction in userArtifactReactions)
                {
                    if (reaction.UserId == user.Id) 
                        continue;
                    
                    var key = $"{user.Id}_{reaction.ArtifactId}_{reaction.UserId}";
                    if (!artifactAchievementHashes.Add(key))
                        continue;
                    
                    var title = (reaction.Title ?? generation.Description)
                        .AchievementTitle();
                    
                    Db.Insert(new Achievement
                    {
                        UserId = user.Id,
                        Type = AchievementType.ArtifactReaction,
                        Title = title,
                        GenerationId = generation.Id,
                        ArtifactId = reaction.ArtifactId,
                        RefId = reaction.Id.ToString(),
                        RefUserId = reaction.UserId,
                        CreatedDate = reaction.CreatedDate,
                        Score = 1,
                    });
                }
            }
        }
    }

    public override void Down()
    {
        Db.ExecuteNonQuery("DROP TRIGGER IF EXISTS update_user_karma_trigger ON \"Achievement\";");
        Db.ExecuteNonQuery("DROP FUNCTION IF EXISTS update_user_karma;");

        Db.ExecuteNonQuery("DROP TRIGGER IF EXISTS update_user_credits ON \"CreditLog\";");
        Db.ExecuteNonQuery("DROP FUNCTION IF EXISTS update_user_credits;");
        
        Db.DropTable<User>();
        Db.DropTable<CreditLog>();
        Db.DropTable<Notification>();
        Db.DropTable<Achievement>();
        Db.DropTable<Document>();
    }
}
