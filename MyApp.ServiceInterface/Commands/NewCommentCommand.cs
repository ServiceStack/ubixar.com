using System.Data;
using MyApp.Data;
using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.Data;
using ServiceStack.OrmLite;

namespace MyApp.ServiceInterface.Commands;

public class NewGenerationComment
{
    public string RefUserId { get; set; }
    public WorkflowGeneration Generation { get; set; }
    public Comment Comment { get; set; }
}

public class NewGenerationCommentCommand(IDbConnectionFactory dbFactory) 
    : AsyncCommand<NewGenerationComment>
{
    protected override async Task RunAsync(NewGenerationComment request, CancellationToken token)
    {
        var generationId = request.Generation.Id;
        var gen = request.Generation
            ?? throw new ArgumentNullException(nameof(request.Generation));
        var comment = request.Comment
            ?? throw new ArgumentNullException(nameof(request.Comment));

        var commentRefId = $"{comment.Id}";
        var cleanBody = comment.Content.StripHtml();

        using var db = await dbFactory.OpenAsync(token);
        if (gen.CreatedBy != comment.CreatedBy)
        {
            await db.InsertAsync(new Notification
            {
                UserId = gen.CreatedBy,
                Type = NotificationType.NewComment,
                RefId = commentRefId,
                GenerationId = generationId,
                CreatedDate = comment.CreatedDate,
                Title = gen.Description.NotificationTitle(),
                Summary = comment.Content.NotificationSummary() ?? "",
                RefUserId = comment.UserId,
            }, token: token);
        }

        var userNameMentions = cleanBody.FindUserNameMentions()
            .Where(x => x != gen.CreatedBy && x != comment.UserId)
            .ToList();
        if (userNameMentions.Count > 0)
        {
            var existingUsers = db.Select(db.From<User>()
                .Where(x => userNameMentions.Contains(x.UserName)));

            foreach (var existingUser in existingUsers)
            {
                var firstMentionPos = cleanBody.IndexOf(existingUser.UserName, StringComparison.Ordinal);
                if (firstMentionPos < 0) continue;

                var startPos = Math.Max(0, firstMentionPos - 50);
                await db.InsertAsync(new Notification
                {
                    UserId = existingUser.Id,
                    Type = NotificationType.CommentMention,
                    RefId = commentRefId,
                    GenerationId = generationId,
                    CreatedDate = comment.CreatedDate,
                    Title = gen.Description.NotificationTitle(),
                    Summary = cleanBody.GenerateNotificationSummary(startPos) ?? "",
                    RefUserId = comment.UserId,
                }, token: token);
            }
        }
    }
}