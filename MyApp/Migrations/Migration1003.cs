using ServiceStack.DataAnnotations;
using ServiceStack.OrmLite;

namespace MyApp.Migrations;

public class Migration1003 : MigrationBase
{
    public class Thread : AuditBase
    {
        [AutoIncrement]
        public int Id { get; set; }
        [Index(Unique = true)]
        public string Url { get; set; }
        public string Description { get; set; }
        public string? ExternalRef { get; set; }
        [Default(0)]
        public int ViewCount { get; set; }
        [Default(1)]
        public long LikesCount { get; set; }
        [Default(0)]
        public long CommentsCount { get; set; }
        public Dictionary<string,object?>? Args { get; set; }
        public long? RefId { get; set; }
        public string RefIdStr { get; set; }
        public DateTime? ClosedDate { get; set; }
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

    public class Comment : AuditBase
    {
        [AutoIncrement]
        public int Id { get; set; }
        public int ThreadId { get; set; }
        public int? ReplyId { get; set; }
        public string Content { get; set; }
        public string? FlagReason { get; set; }
        public string? Notes { get; set; }
        public string UserId { get; set; }
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

    public class CommentReport
    {
        [AutoIncrement]
        public long Id { get; set; }

        [References(typeof(Comment))]
        public int CommentId { get; set; }
    
        [Reference]
        public Comment Comment { get; set; }
    
        [References(typeof(AppUser))]
        public string UserId { get; set; }
    
        public PostReport PostReport { get; set; }
        public string Description { get; set; }

        public DateTime CreatedDate { get; set; }
        public ModerationDecision Moderation { get; set; }
        public string? Notes { get; set; }
    }

    [UniqueConstraint(nameof(ThreadId), nameof(UserId), nameof(Reaction))]
    public class ThreadReaction
    {
        [AutoIncrement]
        public int Id { get; set; }
        [Index]
        public int ThreadId { get; set; }
        [Index]
        public string UserId { get; set; }
        public Reaction Reaction { get; set; }
        [Default("{SYSTEM_UTC}")]
        public DateTime CreatedDate { get; set; }
    }

    [UniqueConstraint(nameof(CommentId), nameof(UserId), nameof(Reaction))]
    public class CommentReaction
    {
        [AutoIncrement]
        public int Id { get; set; }
        [Index]
        public int CommentId { get; set; }
        [Index]
        public string UserId { get; set; }
        public Reaction Reaction { get; set; }
        [Default("{SYSTEM_UTC}")]
        public DateTime CreatedDate { get; set; }
    }
    
    [Flags]
    public enum Reaction {}
    public enum PostReport {}
    public enum ModerationDecision {}

    [Alias("AspNetUsers")]
    class AppUser
    {
        [Alias("Id")]
        public string Id { get; set; }
    }

    public override void Up()
    {
        Db.CreateTable<Thread>();
        Db.CreateTable<ThreadReaction>();
        Db.CreateTable<Comment>();
        Db.CreateTable<CommentReaction>();
        Db.CreateTable<CommentReport>();
    }

    public override void Down()
    {
        Db.DropTable<CommentReport>();
        Db.DropTable<CommentReaction>();
        Db.DropTable<Comment>();
        Db.DropTable<ThreadReaction>();
        Db.DropTable<Thread>();
    }
}
