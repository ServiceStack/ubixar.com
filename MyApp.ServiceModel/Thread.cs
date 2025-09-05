using ServiceStack;
using ServiceStack.DataAnnotations;

namespace MyApp.ServiceModel;

[Tag(Tags.Posts)]
[ValidateIsAuthenticated]
[AutoApply(Behavior.AuditQuery)]
[AutoFilter(QueryTerm.Ensure, nameof(Thread.CreatedBy), Eval = "userAuthId()")]
public class MyThreads : QueryDb<Thread>
{
    public int? AfterId { get; set; }
    public DateTime? AfterModifiedDate { get; set; }
}

[Tag(Tags.Posts)]
[ValidateIsAuthenticated]
[AutoApply(Behavior.AuditQuery)]
public class CreateThread : ICreateDb<Thread>, IReturn<Thread>
{
    [ValidateNotEmpty]
    public string Url { get; set; }
    [ValidateNotEmpty]
    public string Description { get; set; }
    public string? ExternalRef { get; set; }
    public Dictionary<string,object?>? Args { get; set; }
    public long? RefId { get; set; }
    public string RefIdStr { get; set; }
}

[Tag(Tags.Posts)]
[ValidateIsAuthenticated, ValidateActiveUser]
[AutoApply(Behavior.AuditModify)]
[AutoFilter(QueryTerm.Ensure, nameof(Thread.CreatedBy), Eval = "userAuthId()")]
public class UpdateThread : IPatchDb<Thread>, IReturn<Thread>
{
    public int Id { get; set; }
    public string? Description { get; set; }
    public Dictionary<string,object?>? Args { get; set; }
}

[Tag(Tags.Posts)]
[ValidateIsAuthenticated, ValidateActiveUser]
[AutoApply(Behavior.AuditSoftDelete)]
[AutoFilter(QueryTerm.Ensure, nameof(Thread.CreatedBy), Eval = "userAuthId()")]
public class DeleteThread : IDeleteDb<Thread>, IReturnVoid
{
    public int Id { get; set; }
}

[Tag(Tags.Posts)]
[ValidateIsAuthenticated]
[AutoApply(Behavior.AuditQuery)]
public class GetThreadUserData : IGet, IReturn<GetThreadUserDataResponse>
{
    public int ThreadId { get; set; }
}
public class GetThreadUserDataResponse
{
    public int ThreadId { get; set; }
    public bool Liked { get; set; }
    public List<int> UpVoted { get; set; }
    public List<int> DownVoted { get; set; }
    public ResponseStatus? ResponseStatus { get; set; }
}

[Tag(Tags.Posts)]
[AutoApply(Behavior.AuditQuery)]
public class QueryComments : QueryDb<Comment, CommentResult>,
    IJoin<Comment,User>
{
    public int? ThreadId { get; set; }
}

[Tag(Tags.Posts)]
public class GetThread : IGet, IReturn<GetThreadResponse>
{
    public int? Id { get; set; }
    public string? Url { get; set; }
}
public class GetThreadResponse
{
    public Thread Result { get; set; }
    public ResponseStatus? ResponseStatus { get; set; }
}

[Tag(Tags.Posts)]
[ValidateIsAuthenticated, ValidateActiveUser]
[AutoApply(Behavior.AuditCreate)]
[AutoPopulate(nameof(Comment.UserId), Eval = "userAuthId()")]
public class CreateComment : ICreateDb<Comment>, IReturn<Comment>
{
    public int ThreadId { get; set; }
    public int? ReplyId { get; set; }
    [ValidateLength(1,280)]
    public string Content { get; set; }
}

[Tag(Tags.Posts)]
[ValidateIsAuthenticated, ValidateActiveUser]
public class CreateGenerationComment : IPost, IReturn<Comment>
{
    public string GenerationId { get; set; }
    public int? ReplyId { get; set; }
    [ValidateLength(1,280)]
    public string Content { get; set; }
}

[Tag(Tags.Posts)]
[ValidateIsAuthenticated, ValidateActiveUser]
[AutoApply(Behavior.AuditModify)]
[AutoFilter(QueryTerm.Ensure, nameof(Comment.UserId), Eval = "userAuthId()")]
public class UpdateComment : IPatchDb<Comment>, IReturn<Comment>
{
    public int Id { get; set; }
    public string? Content { get; set; }
}

[Tag(Tags.Posts)]
[ValidateIsAuthenticated, ValidateActiveUser]
[AutoApply(Behavior.AuditSoftDelete)]
[AutoFilter(QueryTerm.Ensure, nameof(Comment.UserId), Eval = "userAuthId()")]
public class DeleteComment : IDeleteDb<Comment>, IReturnVoid
{
    public int Id { get; set; }
}

[Tag(Tags.Posts)]
[ValidateIsAuthenticated]
[AutoApply(Behavior.AuditCreate)]
[AutoPopulate(nameof(Comment.UserId), Eval = "userAuthId()")]
public class CreateThreadReaction : ICreateDb<ThreadReaction>, IReturnVoid
{
    public int ThreadId { get; set; }
    public Reaction Reaction { get; set; }
}

[Tag(Tags.Posts)]
[ValidateIsAuthenticated]
[AutoFilter(QueryTerm.Ensure, nameof(Comment.UserId), Eval = "userAuthId()")]
public class DeleteThreadReaction : IDeleteDb<ThreadReaction>, IReturn<EmptyResponse>
{
    public int ThreadId { get; set; }
}

[Tag(Tags.Posts)]
[ValidateIsAuthenticated]
[AutoFilter(QueryTerm.Ensure, nameof(Comment.UserId), Eval = "userAuthId()")]
public class QueryCommentReactions : QueryDb<CommentReaction>
{
    public int ThreadId { get; set; }
}

[Tag(Tags.Posts)]
[ValidateIsAuthenticated]
[AutoApply(Behavior.AuditCreate)]
[AutoPopulate(nameof(Comment.UserId), Eval = "userAuthId()")]
public class CreateCommentReaction : ICreateDb<CommentReaction>, IReturnVoid
{
    public int CommentId { get; set; }
    public Reaction Reaction { get; set; }
}

[Tag(Tags.Posts)]
[ValidateIsAuthenticated]
[AutoFilter(QueryTerm.Ensure, nameof(Comment.UserId), Eval = "userAuthId()")]
public class DeleteCommentReaction : IDeleteDb<CommentReaction>, IReturnVoid
{
    public int CommentId { get; set; }
}

[Tag(Tags.Posts)]
[ValidateIsAuthenticated, ValidateActiveUser]
[AutoApply(Behavior.AuditCreate)]
[AutoPopulate(nameof(CommentReport.UserId), Eval = "userAuthId()")]
[AutoPopulate(nameof(CommentReport.Moderation), Value = ModerationDecision.None)]
public class CreateCommentReport : ICreateDb<CommentReport>, IReturnVoid
{
    public int CommentId { get; set; }
    public PostReport PostReport { get; set; }
    public string? Description { get; set; }
}

[Icon(Svg = Icons.Thread)]
[AutoPopulate(nameof(ExternalRef), Eval = "nguid")]
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

[Icon(Svg = Icons.Comment)]
public class Comment : AuditBase
{
    [AutoIncrement]
    public int Id { get; set; }
    public int ThreadId { get; set; }
    public int? ReplyId { get; set; }
    public string Content { get; set; }
    public string? FlagReason { get; set; }
    public string? Notes { get; set; }
    // [References(typeof(User))]
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

[UniqueConstraint(nameof(ThreadId), nameof(UserId), nameof(Reaction))]
public class ThreadReaction
{
    [AutoIncrement]
    public int Id { get; set; }
    [Index]
    public int ThreadId { get; set; }
    public Reaction Reaction { get; set; }
    public string UserId { get; set; }
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
    public Reaction Reaction { get; set; }
    public string UserId { get; set; }
    [Default("{SYSTEM_UTC}")]
    public DateTime CreatedDate { get; set; }
}

[Icon(Svg = Icons.Report)]
public class CommentReport
{
    [AutoIncrement]
    public long Id { get; set; }

    [References(typeof(Comment))]
    public int CommentId { get; set; }
    
    [Reference]
    public Comment Comment { get; set; }
    
    // [References(typeof(User))]
    public string UserId { get; set; }
    
    public PostReport PostReport { get; set; }
    public string Description { get; set; }

    public DateTime CreatedDate { get; set; }
    public ModerationDecision Moderation { get; set; }
    public string? Notes { get; set; }
}

public enum PostReport
{
    Offensive,
    Spam,
    Nudity,
    Illegal,
    Other,
}

public enum ModerationDecision
{
    [Description("Ignore")]
    None,
    [Description("Approve")]
    Approve,
    [Description("Deny")]
    Deny,
    [Description("Flag")]
    Flag,
    [Description("Delete")]
    Delete,
    [Description("Ban User for a day")]
    Ban1Day,
    [Description("Ban User for a week")]
    Ban1Week,
    [Description("Ban User for a month")]
    Ban1Month,
    [Description("Permanently Ban User")]
    PermanentBan,
}

public class CommentResult
{
    public int Id { get; set; }
    public int ThreadId { get; set; }
    public int? ReplyId { get; set; }
    public string Content { get; set; }
    public int UpVotes { get; set; }
    public int DownVotes { get; set; }
    public int Votes { get; set; }
    public string? FlagReason { get; set; }
    public string? Notes { get; set; }
    // public string UserId { get; set; }
    public string UserName { get; set; }
    public string? Handle { get; set; }
    public string? ProfileUrl { get; set; }
    public string? Avatar { get; set; } //overrides ProfileUrl
    public DateTime CreatedDate { get; set; }
    public DateTime ModifiedDate { get; set; }
}

public class ValidateActiveUserAttribute() : ValidateRequestAttribute("ActiveUser()");
