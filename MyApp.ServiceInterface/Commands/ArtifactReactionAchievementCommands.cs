using Microsoft.Extensions.Logging;
using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.Data;
using ServiceStack.OrmLite;

namespace MyApp.ServiceInterface.Commands;

/// <summary>
/// Creates an achievement for the user that created the artifact when a new reaction is created.
/// Only 1 achievement is created per user per artifact.
/// </summary>
/// <param name="logger"></param>
/// <param name="dbFactory"></param>
public class CreateArtifactReactionAchievementCommand(
    ILogger<CreateArtifactReactionAchievementCommand> logger,
    IDbConnectionFactory dbFactory,
    AppData appData)
    : AsyncCommand<ArtifactReaction>
{
    protected override async Task RunAsync(ArtifactReaction request, CancellationToken token)
    {
        using var db = dbFactory.OpenDbConnection();
        var artifact = await db.SingleByIdAsync<Artifact>(request.ArtifactId, token: token);
        if (artifact == null)
            throw HttpError.NotFound($"Artifact {request.ArtifactId} not found");
        if (artifact.PublishedDate == null)
            throw new Exception($"Artifact {request.ArtifactId} is not published");

        // if (appData.Config.DefaultUserId == artifact.CreatedBy)
        //     return;
        
        if (artifact.CreatedBy == request.UserId)
        {
            logger.LogInformation("⏭️  Skip creating reaction achievement for same user {UserId} on Artifact {ArtifactId}", 
                artifact.CreatedBy, request.ArtifactId);
            return;
        }

        var now = DateTime.UtcNow;
        
        var reactionByUserExists = await db.ExistsAsync<Achievement>(x =>
                x.UserId == artifact.CreatedBy
                && x.Type == AchievementType.ArtifactReaction
                && x.ArtifactId == request.ArtifactId
                && x.RefUserId == request.UserId, 
            token: token);
        
        if (!reactionByUserExists)
        {
            var title = (artifact.Caption
                 ?? artifact.Description
                 ?? await db.ScalarAsync<string>(db.From<WorkflowGeneration>()
                     .Where(x => x.Id == artifact.GenerationId)
                     .Select(x => x.Description), token: token))
                ?.AchievementTitle();
            
            await db.InsertAsync(new Achievement
            {
                UserId = artifact.CreatedBy,
                Type = AchievementType.ArtifactReaction,
                Title = title,
                GenerationId = artifact.GenerationId,
                ArtifactId = request.ArtifactId,
                RefId = request.Id.ToString(), //ArtifactReaction.Id
                RefUserId = request.UserId,
                CreatedDate = now,
                Score = 1,
            }, token: token);
        }
        logger.LogInformation("{Already}Created reaction achievement for {UserId} on Artifact {ArtifactId} by {RefUserId}", 
            reactionByUserExists ? "Already " : "➕ ", artifact.CreatedBy, request.ArtifactId, request.UserId);
    }
}

public class DeleteArtifactReactionAchievementCommand(
    ILogger<DeleteArtifactReactionAchievementCommand> logger,
    IDbConnectionFactory dbFactory,
    AppData appData)
    : AsyncCommand<ArtifactReaction>
{
    protected override async Task RunAsync(ArtifactReaction request, CancellationToken token)
    {
        using var db = dbFactory.OpenDbConnection();
        var artifact = await db.SingleAsync<Artifact>(request.ArtifactId, token: token);
        if (artifact == null)
            throw HttpError.NotFound($"Artifact {request.ArtifactId} not found");

        // if (appData.Config.DefaultUserId == artifact.CreatedBy)
        //     return;
        
        var anyReactionsRemaining = await db.ExistsAsync<ArtifactReaction>(x => 
            x.ArtifactId == request.ArtifactId
            && x.UserId == request.UserId, 
            token: token);
        if (anyReactionsRemaining)
        {
            logger.LogInformation("⏭️  Skip deleting reaction achievement for {UserId} on Artifact {ArtifactId} by {RefUserId} as there are other reactions remaining", 
                artifact.CreatedBy, request.ArtifactId, request.UserId);
            return;
        }

        var deleteAchievementIds = await db.ColumnAsync<int>(db.From<Achievement>()
                .Where(x =>
                    x.UserId == artifact.CreatedBy
                    && x.Type == AchievementType.ArtifactReaction
                    && x.ArtifactId == request.ArtifactId
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
            logger.LogInformation("❌ Deleted {Count} reaction {Achievements} for {UserId} on Artifact {ArtifactId} by {RefUserId}", 
                deleted, "achievement".Plural(deleted), artifact.CreatedBy, request.ArtifactId, request.UserId);
        }
    }
}
