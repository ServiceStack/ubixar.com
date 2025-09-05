#if false
using Microsoft.Extensions.Logging;
using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.Jobs;
using ServiceStack.OrmLite;

namespace MyApp.ServiceInterface.Commands;

public class ExecuteComfyApiPromptState
{
    public string? DeviceId { get; set; }
    public string? PromptId { get; set; }
    public Dictionary<string,object?>? ComfyResult { get; set; }
    public WorkflowResult? Result { get; set; }
}

public class ExecuteComfyApiPromptCommand(
    ILogger<ExecuteComfyApiPromptCommand> logger,
    IBackgroundJobs jobs,
    AppData appData,
    AgentEventsManager agentManager) : SyncCommandWithResult<ExecuteComfyApiPrompt, ExecuteComfyApiPromptState>
{
    protected override ExecuteComfyApiPromptState Run(ExecuteComfyApiPrompt request)
    {
        var job = Request.GetBackgroundJob();
        var log = Request.CreateJobLogger(jobs, logger);
        
        // Fetch latest Job from DB to get latest state 
        var dbJobResult = jobs.GetJob(job.Id);
        
        // Shouldn't get here but if Job has been completed exit
        if (dbJobResult?.Completed != null)
        {
            log.LogInformation("Job {Id} has already been completed", job.Id);
            var res = dbJobResult.Completed.ResponseBody.FromJson<ExecuteComfyApiPromptState>();
            return res;
        }
        
        // Shouldn't get here but if Job has been completed or failed, exit
        if (dbJobResult?.Failed != null)
        {
            var msg = dbJobResult.Failed.Error?.Message ?? dbJobResult.Failed.Error?.ErrorCode ?? "AlreadyFailed";
            log.LogError("Job {Id} has already failed: {Message}", job.Id, msg);
            throw new Exception(msg);
        }

        var dbJob = dbJobResult?.Job
            ?? throw new Exception($"Job {job.Id} not found");

        var state = dbJob.ResponseBody != null
            ? dbJob.ResponseBody.FromJson<ExecuteComfyApiPromptState>()
            : new ExecuteComfyApiPromptState();

        if (state.DeviceId == null)
        {
            var agent = appData.GetComfyAgent(new(
                UserId: request.UserId,
                RequiredNodes: request.RequiredNodes,
                RequiredAssets: request.RequiredAssets));

            if (agent != null)
            {
                state.DeviceId = agent.DeviceId;

                var responseBody = state.ToJson();
                using var db = jobs.OpenDb();
                db.UpdateOnly(() => new BackgroundJob {
                    ResponseBody = responseBody
                }, x => x.Id == job.Id);
            }
        }
        return state;
    }
}
#endif