using Microsoft.Extensions.Logging;
using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.Data;
using ServiceStack.OrmLite;

namespace MyApp.ServiceInterface.Commands;

/// <summary>
/// Creates an achievement for the user that created the comment when a new reaction is created.
/// Only 1 achievement is created per user per comment.
/// </summary>
/// <param name="logger"></param>
/// <param name="dbFactory"></param>
public class CreateCommentReactionAchievementCommand(
    ILogger<CreateCommentReactionAchievementCommand> logger,
    IDbConnectionFactory dbFactory,
    AppData appData)
    : AsyncCommand<CommentReaction>
{
    protected override async Task RunAsync(CommentReaction request, CancellationToken token)
    {
        using var db = dbFactory.OpenDbConnection();
        var comment = await db.SingleByIdAsync<Comment>(request.CommentId, token: token);
        if (comment == null)
            throw HttpError.NotFound($"Comment {request.CommentId} not found");
        var thread = await db.SingleByIdAsync<ServiceModel.Thread>(comment.ThreadId, token: token);
        if (thread == null)
            throw HttpError.NotFound($"Thread {comment.ThreadId} not found");

        // if (appData.Config.DefaultUserId == comment.CreatedBy)
        //     return;
        
        if (comment.CreatedBy == request.UserId)
        {
            logger.LogInformation("⏭️  Skip creating reaction achievement for same user {UserId} on Comment {CommentId}", 
                comment.CreatedBy, request.CommentId);
            return;
        }
        
        var commentId = request.CommentId.ToString();
        var reactionByUserExists = await db.ExistsAsync<Achievement>(x =>
                x.UserId == comment.CreatedBy
                && x.Type == AchievementType.CommentReaction
                && x.GenerationId == thread.RefIdStr
                && x.RefId == commentId
                && x.RefUserId == request.UserId, 
            token: token);
        
        if (!reactionByUserExists)
        {
            await db.InsertAsync(new Achievement
            {
                UserId = comment.CreatedBy,
                Type = AchievementType.CommentReaction,
                Title = comment.Content.AchievementTitle(),
                GenerationId = thread.RefIdStr,
                RefId = commentId,
                RefUserId = request.UserId,
                CreatedDate = DateTime.UtcNow,
                Score = 1,
            }, token: token);
        }
        logger.LogInformation("{Already}Created reaction achievement for {UserId} on Comment {CommentId} by {RefUserId}", 
            reactionByUserExists ? "Already " : "➕ ", comment.CreatedBy, request.CommentId, request.UserId);
    }
}

public class DeleteCommentReactionAchievementCommand(
    ILogger<DeleteCommentReactionAchievementCommand> logger,
    IDbConnectionFactory dbFactory,
    AppData appData)
    : AsyncCommand<CommentReaction>
{
    protected override async Task RunAsync(CommentReaction request, CancellationToken token)
    {
        using var db = dbFactory.OpenDbConnection();
        var comment = await db.SingleAsync<Comment>(request.CommentId, token: token);
        if (comment == null)
            throw HttpError.NotFound($"Comment {request.CommentId} not found");
        
        // if (appData.Config.DefaultUserId == comment.CreatedBy)
        //     return;
        
        var anyReactionsRemaining = await db.ExistsAsync<CommentReaction>(x => 
            x.CommentId == request.CommentId
            && x.UserId == request.UserId, 
            token: token);
        if (anyReactionsRemaining)
        {
            logger.LogInformation("⏭️  Skip deleting reaction achievement for {UserId} on Comment {CommentId} by {RefUserId} as there are other reactions remaining", 
                comment.CreatedBy, request.CommentId, request.UserId);
            return;
        }

        var commentId = request.CommentId.ToString();
        var deleteAchievementIds = await db.ColumnAsync<int>(db.From<Achievement>()
                .Where(x => 
                    x.UserId == comment.CreatedBy
                    && x.Type == AchievementType.CommentReaction
                    && x.RefId == commentId
                    && x.RefUserId == request.UserId)
                .Select(x => x.Id),
            token: token);

        if (deleteAchievementIds.Count > 0)
        {
            await db.DeleteByIdsAsync<Achievement>(deleteAchievementIds, token: token);

            // Not needed unless synced to client IndexedDbs
            // db.BulkInsert(deleteAchievementIds.Map(x => 
            //     new DeletedRow { Table = Table.Achievement, Key = $"{x}" }));
            
            var deleted = deleteAchievementIds.Count;
            logger.LogInformation("❌ Deleted {Count} reaction {Achievements} for {UserId} on Comment {CommentId} by {RefUserId}", 
                deleted, "achievement".Plural(deleted), comment.CreatedBy, request.CommentId, request.UserId);
        }
    }
}
