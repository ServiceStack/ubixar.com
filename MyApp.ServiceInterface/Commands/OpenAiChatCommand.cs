using System.Collections.Concurrent;
using System.Data;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.Data;
using ServiceStack.Jobs;
using ServiceStack.OrmLite;
using ServiceStack.Text;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace MyApp.ServiceInterface.Commands;

public record ChatCompletionResult(ChatCompletion Request, BackgroundJob Job);

public class ChatCompletionCommand(
    ILogger<ChatCompletionCommand> logger,
    IBackgroundJobs jobs) : AsyncCommandWithResult<ChatCompletion, OpenAiChatResponse?>
{
    public const string LogPrefix = "[OpenAiChatCommand] ";
    public static IEnumerable<ChatCompletionResult> GetTaskResults() => Tasks.ValuesWithoutLock();
    public static ConcurrentDictionary<long,ChatCompletionResult> Tasks { get; } = new();
    public static ConcurrentDictionary<long,ChatCompletionResult?> AssignedTasks { get; } = new();
    public static ConcurrentDictionary<long,ChatCompletionResult?> CompletedTasks { get; } = new();

    public static BackgroundJobBase GetJob(long refId, IBackgroundJobs jobs)
    {
        if (Tasks.TryGetValue(refId, out var task))
        {
            return task.Job;
        }
        return jobs.GetJobByRefId($"{refId}")?.Job
            ?? throw HttpError.NotFound("Job not found");
    }

    public static void AddTask(ChatCompletion request, BackgroundJob job)
    {
        var refId = long.Parse(job.RefId ?? throw new ArgumentNullException(nameof(job.RefId)));
        Tasks[refId] = new(request, job);
    }
    public static void AssignedTask(long refId, string deviceId)
    {
        var task = Tasks.GetValueOrDefault(refId);
        AssignedTasks[refId] = task;
        if (task != null)
        {
            task.Job.Worker = deviceId;
        }
    }
    public static void CompleteTask(long refId, BackgroundJobBase job, object response)
    {
        var task = Tasks.GetValueOrDefault(refId);
        CompletedTasks[refId] = task;

        if (task != null)
        {
            task.Job.Response = job.Response;
            task.Job.ResponseBody = job.ResponseBody;
            task.Job.Status = job.Status;
            task.Job.Error = job.Error;
            task.Job.LastActivityDate = job.LastActivityDate;
            task.Job.TransientResponse = response;
        }
    }
    public static bool ProcessTasks(JobLogger log, long refId)
    {
        if (AssignedTasks.TryRemove(refId, out var assignedTask))
        {
            if (assignedTask != null)
            {
                log.LogInformation("{LogPrefix}Assigned Task {RefId} was assigned to {Worker}", 
                    LogPrefix, refId, assignedTask.Job.Worker);
            }
            else
            {
                log.LogWarning("{LogPrefix}Assigned Task {RefId} was missing", LogPrefix, refId);
            }
        }
        if (CompletedTasks.TryRemove(refId, out var completedTask))
        {
            if (completedTask != null)
            {
                log.LogInformation("{LogPrefix}Task {RefId} was completed", LogPrefix, refId);
            }
            else
            {
                log.LogWarning("{LogPrefix}Completed Task {RefId} was missing", LogPrefix, refId);
            }
            Tasks.TryRemove(refId, out _);
            return true;
        }
        return false;
    }

    protected override async Task<OpenAiChatResponse?> RunAsync(ChatCompletion request, CancellationToken token)
    {
        var log = Request.CreateJobLogger(jobs, logger);
        var job = Request.GetBackgroundJob();
        var refId = long.Parse(job.RefId ?? throw new ArgumentNullException(nameof(job.RefId)));
        
        log.LogInformation("{LogPrefix}{JobId}/{Id} for {Model}",
            LogPrefix, job.Id, refId, request.Model);

        AddTask(request, job);

        var i = 0;
        while (!token.IsCancellationRequested && Tasks.ContainsKey(refId)
               && job.CompletedDate == null && job.Error == null && job.Response == null)
        {
            if (ProcessTasks(log, refId))
                return job.TransientResponse as OpenAiChatResponse;
            if (i++ % 100 == 0)
            {
                log.LogInformation("{LogPrefix}{JobId}/{Id} for {Model} - {Seconds} seconds elapsed",
                    LogPrefix, job.Id, refId, request.Model, i / 10);
            }
            await Task.Delay(100, token);
        }
        
        ProcessTasks(log, refId);
        Tasks.TryRemove(refId, out _);
        
        var response = job.TransientResponse as OpenAiChatResponse;
        return response;
    }
}

public class CaptionArtifactCommand(
    ILogger<CaptionArtifactCommand> logger, IBackgroundJobs jobs, IDbConnectionFactory dbFactory) 
    : AsyncCommand<OpenAiChatResponse>
{
    public const string Prompt = "Caption this image";
    
    protected override async Task RunAsync(OpenAiChatResponse request, CancellationToken token)
    {
        var job = Request.GetBackgroundJob();
        try
        {
            if (request.Choices?.FirstOrDefault() == null)
                throw new ArgumentException(GenerationStatus.NoResults);

            var answer = request.Choices[0].Message.Content;
            var log = Request.CreateJobLogger(jobs, logger);
            var artifactId = job.Args?.GetValueOrDefault("artifactId");
            var artifactIdValue = long.Parse(artifactId ?? throw new ArgumentNullException(nameof(artifactId)));
            var userId = request.Metadata?.GetValueOrDefault("userId") 
                         ?? job.UserId ?? throw new ArgumentNullException(nameof(job.UserId));
            log.LogInformation("CaptionArtifactCommand {Id}/{RefId}/{ArtifactId} - {Answer}", 
                job.Id, job.RefId, artifactId, answer);
            using var db = dbFactory.OpenWithName(nameof(CaptionArtifactCommand));
            var updated = await db.UpdateOnlyAsync(() => new Artifact {
                Caption = answer,
                ModifiedBy = userId,
                ModifiedDate = DateTime.UtcNow,
            }, x => x.Id == artifactIdValue, token: token);
            if (updated == 0)
                throw new ArgumentNullException(nameof(Artifact));
        }
        catch (ArgumentException e)
        {
            jobs.UpdateJobStatus(new(job, status: e.Message));
        }
    }
}

public class DescribeArtifactCommand(
    ILogger<DescribeArtifactCommand> logger, IBackgroundJobs jobs, IDbConnectionFactory dbFactory)
    : AsyncCommand<OpenAiChatResponse>
{
    public const string Prompt = "Description of this image";
    
    protected override async Task RunAsync(OpenAiChatResponse request, CancellationToken token)
    {
        var job = Request.GetBackgroundJob();
        try
        {
            if (request.Choices?.FirstOrDefault() == null)
                throw new ArgumentException(GenerationStatus.NoResults);

            var answer = request.Choices[0].Message.Content;
            var log = Request.CreateJobLogger(jobs, logger);
            var artifactId = job.Args?.GetValueOrDefault("artifactId");
            var artifactIdValue = long.Parse(artifactId ?? throw new ArgumentNullException(nameof(artifactId)));
            var userId = request.Metadata?.GetValueOrDefault("userId") 
                ?? job.UserId ?? throw new ArgumentNullException(nameof(job.UserId));
            log.LogInformation("DescribeArtifactCommand {Id}/{RefId}/{ArtifactId} - {Answer}", 
                job.Id, job.RefId, artifactId, answer);
            using var db = dbFactory.OpenWithName(nameof(CaptionArtifactCommand));
            var updated = await db.UpdateOnlyAsync(() => new Artifact {
                Description = answer,
                ModifiedBy = userId,
                ModifiedDate = DateTime.UtcNow,
            }, x => x.Id == artifactIdValue, token: token);
            if (updated == 0)
                throw new ArgumentNullException(nameof(Artifact));
        }
        catch (ArgumentException e)
        {
            jobs.UpdateJobStatus(new(job, status: e.Message));
        }
    }
}

public class ChatCompletionServices(
    ILogger<ChatCompletionServices> log,
    IBackgroundJobs jobs,
    AppData appData) : Service
{
    public async Task<object?> Get(GetChatCompletion request)
    {
        var feature = AssertPlugin<DatabaseJobFeature>();
        var models = request.Models;
        if (models.IsEmpty())
            throw new ArgumentNullException(nameof(request.Models));
        
        var userId = Request.AssertApiKeyUserId();
        var device = request.Device;
        var startedAt = DateTime.UtcNow;
        var waitFor = TimeSpan.FromSeconds(30);

        //var aiTasks = OpenAiChatCommand.Tasks;
        var ret = new List<AgentEvent>();
        using var dbJobs = feature.OpenDb();

        async Task<ChatCompletionResult?> AssignPendingTask(IDbConnection db)
        {
            var pendingTasks = ChatCompletionCommand.GetTaskResults()
                .Where(x => (x.Job.Worker == null || x.Job.Worker == device)
                    && request.Models.Contains(x.Request.Model))
                .OrderBy(x => x.Job.Id);

            foreach (var task in pendingTasks)
            {
                var job = task.Job;
                job.Worker = device; 
                job.UserId = userId;
                job.LastActivityDate = DateTime.UtcNow;
                job.Status = GenerationStatus.AssignedToAgent;
                var assignTask = await db.UpdateOnlyAsync(() => new BackgroundJob
                {
                    Worker = job.Worker,
                    UserId = job.UserId,
                    LastActivityDate = job.LastActivityDate,
                    Status = job.Status,
                }, x => x.Id == task.Job.Id && (x.Worker == null || x.Worker == device));

                if (assignTask == 1)
                {
                    log.LogInformation("GetAiTasks assigned {Id} {RefId} for {Model} to {Device}",
                        task.Job.Id, task.Job.RefId, task.Request.Model, device);
                    ChatCompletionCommand.AssignedTask(task.Job.RefId.ToLong(), device);
                    return task;
                }
            }
            return null;
        }

        ChatCompletion? ChatFilter(ChatCompletionResult completionResult)
        {
            try
            {
                var chatRequest = completionResult.Request;
                chatRequest.Metadata ??= new();
                chatRequest.Metadata["replyTo"] = Request.ResolveAbsoluteUrl(completionResult.Job.ReplyTo)
                    .AddQueryParam("device", request.Device);
                foreach (var message in chatRequest.Messages)
                {
                    if (message.Content is JsonElement { ValueKind: JsonValueKind.Array } el)
                    {
                        var contents = (List<object>) el.AsObject()!;
                        foreach (var content in contents)
                        {
                            if (content is Dictionary<string,object> dict
                                && dict.TryGetValue("image_url", out var oImageUrl) 
                                && oImageUrl is Dictionary<string,object> imageUrl)
                            {
                                if (imageUrl.TryGetValue("url", out var oUrl) && oUrl is string url)
                                {
                                    byte[]? imageBytes = null;
                                    if (url.StartsWith('/') || url.StartsWith("../"))
                                    {
                                        var usePath = url.StartsWith('/')
                                            ? url.StartsWith("/artifacts/")
                                                ? appData.GetArtifactPath(url.LastRightPart('/'))
                                                : url
                                            : appData.ContentRootPath.CombineWith(url);
                                        if (!File.Exists(usePath))
                                            throw HttpError.NotFound($"Image not found: {usePath}");
                                        imageBytes = File.ReadAllBytes(usePath);
                                    }
                                    else if (url.StartsWith("http://") || url.StartsWith("https://"))
                                    {
                                        imageBytes = url.GetBytesFromUrl();
                                    }
                                    if (imageBytes != null)
                                    {
                                        var base64 = Convert.ToBase64String(imageBytes);
                                        var ext = url.LastRightPart('.');
                                        var mimeType = MimeTypes.GetMimeType(ext);
                                        var dataUri = $"data:{mimeType};base64,{base64}";
                                        imageUrl["url"] = dataUri;
                                    }
                                }
                            }
                        }
                        message.Content = JsonSerializer.SerializeToElement(contents);
                    }
                }
                return chatRequest;
            }
            catch (Exception e)
            {
                log.LogError(e, "Failed to filter chat request: {Message}", e.Message);
                jobs.FailJob(completionResult.Job, e);
                return null;
            }
        }

        while ((DateTime.UtcNow - startedAt) < waitFor)
        {
            var result = await AssignPendingTask(dbJobs);
            if (result != null)
            {
                var validResult = ChatFilter(result);
                if (validResult != null)
                    return validResult;
            }
            await Task.Delay(100);
        }

        if (ret.Count == 0)
        {
            var existingIds = ChatCompletionCommand.GetTaskResults().Select(x => x.Job.Id).ToList();
            var pendingJobs = dbJobs.Select(dbJobs.From<BackgroundJob>()
                .Where(x => x.CompletedDate == null && x.Error == null && x.Command == nameof(ChatCompletionCommand) 
                    && (x.Worker == null || x.Worker == device)
                    && !existingIds.Contains(x.Id))
                .OrderBy(x => x.Id));

            if (pendingJobs.Count > 0)
            {
                log.LogInformation("Found {Count} pending AiTask jobs", pendingJobs.Count);
                foreach (var job in pendingJobs)
                {
                    var chatRequest = job.RequestBody.FromJson<ChatCompletion>();
                    ChatCompletionCommand.AddTask(chatRequest, job);
                }
            }

            var result = await AssignPendingTask(dbJobs);
            if (result != null)
            {
                return ChatFilter(result);
            }
        }
        
        return null;
    }

    public async Task<object> Post(CompleteChatCompletion request)
    {
        var userId = Request.AssertApiKeyUserId();
        var job = ChatCompletionCommand.GetJob(request.RefId, jobs);

        request.Metadata ??= new();
        request.Metadata[nameof(userId)] = userId;
        if (request.ResponseStatus != null)
        {
            job.Error = request.ResponseStatus;
            job.Status = GenerationStatus.GenerationFailed;
        }
        else
        {
            job.Response = nameof(OpenAiChatResponse);
            job.ResponseBody = request.ToJson();
            job.Status = GenerationStatus.GenerationCompleted;
        }
        job.LastActivityDate = DateTime.UtcNow;
        
        if (job is BackgroundJob backgroundJob)
            backgroundJob.TransientResponse = request;

        ChatCompletionCommand.CompleteTask(request.RefId, job, request);

        return new EmptyResponse();
    }
}