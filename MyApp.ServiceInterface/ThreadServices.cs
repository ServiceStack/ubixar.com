using System;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using MyApp.ServiceInterface.Commands;
using ServiceStack;
using ServiceStack.OrmLite;
using ServiceStack.Jobs;
using MyApp.ServiceModel;
using Thread = MyApp.ServiceModel.Thread;

namespace MyApp.ServiceInterface;

public class ThreadServices(
    IAutoQueryDb autoQuery, 
    IBackgroundJobs jobs, 
    AppConfig appConfig,
    AppData appData) : Service
{
    [FromServices]
    public SmtpConfig? SmtpConfig { get; set; }
    
    // public object Get(GetThreadUserData request)
    // {
    //     var userId = Request.GetRequiredUserId();
    //     var votes = Db.Select(Db.From<CommentReaction>().Join<Comment>()
    //         .Where(x => x.UserId == userId)
    //         .And<Comment>(x => x.ThreadId == request.ThreadId));
    //     var liked = Db.Exists<ThreadReaction>(x => x.ThreadId == request.ThreadId && x.UserId == userId);
    //
    //     var ret = new GetThreadUserDataResponse
    //     {
    //         ThreadId = request.ThreadId,
    //         Liked = liked,
    //         UpVoted = votes.Where(x => x.Vote > 0).Map(x => x.CommentId),
    //         DownVoted = votes.Where(x => x.Vote < 0).Map(x => x.CommentId),
    //     };
    //     return ret;
    // }

    public object Get(GetThread request)
    {
        var result = request.Id != null
            ? Db.SingleById<Thread>(request.Id)
            : null;

        if (request.Url != null)
        {
            var normalizedUrl = request.Url = request.Url.ToLower();
            normalizedUrl = normalizedUrl.LeftPart('?');
            if (normalizedUrl.EndsWith(".html"))
                normalizedUrl = normalizedUrl[..^5];
            result = Db.Single(Db.From<Thread>().Where(x => x.Url == normalizedUrl));
            if (result == null)
            {
                result = new Thread {
                    Url = normalizedUrl,
                    LikesCount = 1,
                    CreatedDate = DateTime.UtcNow,
                    ExternalRef = Guid.NewGuid().ToString("N"),
                };
                result.Id = (int)Db.Insert(result, selectIdentity: true);
            }
        }
        
        if (result == null)
            throw HttpError.NotFound("Thread does not exist");

        Db.UpdateAdd(() => new Thread { ViewCount = 1 }, where:x => x.Id == result.Id);
        
        return new GetThreadResponse {
            Result = result
        };
    }
    
    // public void RefreshLikes(int threadId)
    // {
    //     var threadLikes = Db.Count<ThreadReaction>(x => x.ThreadId == threadId);
    //     Db.UpdateOnly(() => new Thread { LikesCount = threadLikes + 1 }, where: x => x.Id == threadId);
    // }

    public async Task<Thread> Post(CreateThread request)
    {
        var thread = new Thread
        {
            Url = request.Url,
            Description = request.Description,
            ExternalRef = request.ExternalRef ?? Guid.NewGuid().ToString("N"),
            Args = request.Args,
            RefId = request.RefId,
            RefIdStr = request.RefIdStr,
        }.WithAudit(Request);
        thread.Id = (int) await Db.InsertAsync(thread, selectIdentity: true);
        if (request.Url.Contains("{id}") || request.Url.Contains("{Id}"))
        {
            var id = thread.Id.ToString();
            var url = request.Url.Replace("{id}", id).Replace("{Id}", id);
            await Db.UpdateOnlyAsync(() => new Thread { Url = url }, where: x => x.Id == thread.Id);
        }
        return thread;
    }

    // public void Post(CreateThreadReaction request)
    // {
    //     autoQuery.Create(request, base.Request);
    //     RefreshLikes(request.ThreadId);
    // }
    //
    // public void Delete(DeleteThreadReaction request)
    // {
    //     autoQuery.Delete(request, base.Request);
    //     RefreshLikes(request.ThreadId);
    // }
    
    // void RefreshVotes(int commentId)
    // {
    //     var commentVotes = Db.Select<CommentReaction>(x => x.CommentId == commentId);
    //     var upVotes = commentVotes.Count(x => x.Vote > 0);
    //     var downVotes = commentVotes.Count(x => x.Vote < 0);
    //     var votes = upVotes - downVotes;
    //     Db.UpdateOnly(() => new Comment
    //     {
    //         UpVotes = upVotes,
    //         DownVotes = downVotes,
    //         Votes = votes + 1,
    //     }, where: x => x.Id == commentId);
    // }

    // public void Post(CreateCommentReaction request)
    // {
    //     autoQuery.Create(request, base.Request);
    //     RefreshVotes(request.CommentId);
    // }
    //
    // public void Delete(DeleteCommentReaction request)
    // {
    //     autoQuery.Delete(request, base.Request);
    //     RefreshVotes(request.CommentId);
    // }

    public async Task<object> Post(CreateGenerationComment request)
    {
        var gen = await Db.AssertGenerationAsync(request.GenerationId);
        if (gen.PublicThreadId == null)
        {
            var caption = await Db.ScalarAsync<string?>(Db.From<Artifact>()
                .Where(x => x.GenerationId == request.GenerationId && x.Caption != null)
                .Select(x => x.Caption)
                .OrderBy(x => x.Id));

            var thread = await Post(new CreateThread
            {
                Url = appConfig.PublicBaseUrl.CombineWith($"/generations/{gen.Id}"),
                Description = caption 
                    ?? gen.Description.SubstringWithEllipsis(0,120) 
                    ?? $"{appConfig.AppName} Generation",
                RefIdStr = gen.Id,
            });
            gen.PublicThreadId = thread.Id;
            await Db.UpdateOnlyAsync(() => new WorkflowGeneration
            {
                PublicThreadId = thread.Id,
                ModifiedBy = Request.GetRequiredUserId(),
                ModifiedDate = DateTime.UtcNow,
            }, where: x => x.Id == request.GenerationId);
        }
        
        var comment = await Post(new CreateComment {
            ThreadId = gen.PublicThreadId.Value,
            ReplyId = request.ReplyId,
            Content = request.Content,
        });
        
        jobs.EnqueueCommand<NewGenerationCommentCommand>(new NewGenerationComment {
            RefUserId = Request.GetRequiredUserId(),
            Generation = gen,
            Comment = comment,
        });
        
        return comment;
    }
    
    public async Task<Comment> Post(CreateComment request)
    {
        var ret = (Comment) await autoQuery.CreateAsync(request, base.Request);
        if (SmtpConfig?.NotificationsEmail == null && request.ReplyId == null)
            return ret;

        var thread = await Db.SingleByIdAsync<Thread>(request.ThreadId);
        if (thread != null)
        {
            var replyUserId = request.ReplyId != null
                ? (await Db.SingleByIdAsync<Comment>(request.ReplyId.Value))?.UserId
                : null;
            var replyUser = replyUserId != null 
                ? await Db.SingleAsync<(string Email, string Name)>(Db.From<AppUser>()
                    .Where(x => x.Id == replyUserId)
                    .Select(x => new { x.Email, x.DisplayName }))
                : new();

            var toEmail = replyUser.Email ?? SmtpConfig?.NotificationsEmail;
            if (toEmail != null)
            {
                var authorName = Request.GetClaimsPrincipal().GetNickName();
                var domain = new Uri(thread.Url).Host;
                var email = new SendEmail {
                    To = toEmail,
                    ToName = replyUser.Name ?? "Notification",
                    Subject = replyUser.Name != null 
                        ? $"New reply from {authorName} on {domain}"
                        : $"New comment on {domain}",
                    BodyText = $"""
                                Comment by {authorName} on {thread.Url}:

                                > {request.Content}
                                """,
                };
                jobs.EnqueueCommand<SendEmailCommand>(email);
            }
        }
        return ret;
    }

    public object Any(CreateCommentReport request)
    {
        var ret = autoQuery.Create(request, base.Request);
        if (SmtpConfig?.NotificationsEmail == null)
            return ret;
        
        var comment = Db.SingleById<Comment>(request.CommentId);
        if (comment != null)
        {
            var thread = Db.SingleById<Thread>(comment.ThreadId);
            if (thread != null)
            {
                var authorName = Request.GetClaimsPrincipal().GetNickName();
                var domain = new Uri(thread.Url).Host;
                var reason = request.Description != null ? "Reason:\n" + request.Description : "";
                var email = new SendEmail {
                    To = SmtpConfig.NotificationsEmail,
                    ToName = "Notification",
                    Subject = $"New report comment on {domain}",
                    BodyText = $"""
                                Comment Reported as {request.PostReport} by {authorName} on {thread.Url}:

                                > {comment.Content}
                                
                                {reason}
                                """,
                };
                jobs.EnqueueCommand<SendEmailCommand>(email);
            }
        }
        return ret;
    }

    public async Task<object> Any(CreateCommentReaction request)
    {
        var ret = (CommentReaction) await autoQuery.CreateAsync(request, base.Request);
        jobs.EnqueueCommand<CreateCommentReactionAchievementCommand>(ret);
        return ret;
    }

    public async Task<object> Any(DeleteCommentReaction request)
    {
        var ret = await autoQuery.DeleteAsync(request, base.Request);
        jobs.EnqueueCommand<DeleteCommentReactionAchievementCommand>(new CommentReaction {
            CommentId = request.CommentId,
            UserId = Request.GetRequiredUserId(),
        });
        return ret;
    }
    
}
