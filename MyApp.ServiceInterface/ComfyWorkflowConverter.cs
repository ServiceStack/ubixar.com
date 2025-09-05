using System.Diagnostics;
using Microsoft.Extensions.Logging;
using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.Text;

namespace MyApp.ServiceInterface;

public interface IComfyWorkflowConverter
{
    Task<ApiPromptResult> CreateApiPromptAsync(WorkflowVersion workflowVersion, Dictionary<string, object?> args, ComfyAgent? agent=null, string? clientId=null);
}

public record class ApiPromptResult(ApiPrompt ApiPrompt, Dictionary<string, object?> Workflow, string apiPromptJson);

public class CSharpComfyWorkflowConverter(ILogger<CSharpComfyWorkflowConverter> log, AppData appData) : IComfyWorkflowConverter
{
    public Task<ApiPromptResult> CreateApiPromptAsync(WorkflowVersion workflowVersion, Dictionary<string, object?> args, ComfyAgent? agent=null, string? clientId = null)
    {
        var workflow = workflowVersion.Workflow;
        var workflowInfo = workflowVersion.Info;
        if (args.Count > 0)
        {
            var result = ComfyWorkflowParser.MergeWorkflow(workflow, args, workflowInfo);
            workflow = result.Result;
        }
        var apiPrompt = CreateApiPrompt(workflow, args, agent, clientId);
        return Task.FromResult(new ApiPromptResult(apiPrompt, workflow, apiPrompt.ToJson()));
    }

    public ApiPrompt CreateApiPrompt(Dictionary<string, object?> workflow, Dictionary<string,object?> args, ComfyAgent? agent=null, string? clientId=null) 
    {
        var requiredNodes = ComfyWorkflowParser.ExtractNodeTypes(workflow, log);
        var requiredAssets = ComfyWorkflowParser.ExtractAssetPaths(workflow, log);
        var nodeDefs = appData.GetSupportedNodeDefinitions(requiredNodes, requiredAssets, agent);
        var apiPrompt = ComfyConverters.ConvertWorkflowToApiPrompt(workflow, nodeDefs, clientId, log:log);
        return apiPrompt;
    }
}

/// <summary>
/// Creates an API Prompt from the existing API Prompt stored in the database for the workflow version.
/// </summary>
/// <param name="log"></param>
/// <param name="appData"></param>
public class CSharpPromptComfyWorkflowConverter(ILogger<CSharpComfyWorkflowConverter> log, AppData appData) : IComfyWorkflowConverter
{
    public Task<ApiPromptResult> CreateApiPromptAsync(WorkflowVersion workflowVersion, Dictionary<string, object?> args, ComfyAgent? agent=null, string? clientId = null)
    {
        var workflow = workflowVersion.Workflow;
        var workflowInfo = workflowVersion.Info;
        var prompt = workflowVersion.ApiPrompt
            ?? throw new Exception($"API Prompt not found for workflow version {workflowVersion.Id}");
        if (args.Count > 0)
        {
            var result = ComfyWorkflowParser.MergeWorkflow(workflow, args, workflowInfo, log);
            workflow = result.Result;
            prompt = ComfyConverters.CreatePrompt(prompt, workflowInfo, args, log);
        }
        
        clientId ??= Guid.NewGuid().ToString("N");
        var apiPrompt = new ApiPrompt
        {
            ClientId = clientId,
            Prompt = prompt,
            ExtraData = new()
            {
                ["extra_pnginfo"] = new Dictionary<string, object?>
                {
                    ["workflow"] = workflow
                },
                ["client_id"] = clientId,
            }
        };
        
        return Task.FromResult(new ApiPromptResult(apiPrompt, workflow, prompt.ToJson()));
    }
}

public class NodeComfyWorkflowConverter(ILogger<NodeComfyWorkflowConverter> log, AppData appData) 
    : IComfyWorkflowConverter
{
    public async Task<ApiPromptResult> CreateApiPromptAsync(WorkflowVersion workflowVersion, Dictionary<string, object?> args, ComfyAgent? agent=null, string? clientId = null)
    {
        var workflow = workflowVersion.Workflow;
        var requiredNodes = ComfyWorkflowParser.ExtractNodeTypes(workflow, log);
        var requiredAssets = ComfyWorkflowParser.ExtractAssetPaths(workflow, log);
        agent ??= appData.GetSupportedAgent(requiredNodes, requiredAssets);
        var nodeDefinitionPath = agent != null
            ? appData.GetDeviceObjectInfoPath(agent.DeviceId)
            : appData.DefaultObjectInfoPath;
        var workflowPath = appData.WorkflowsPath.CombineWith(workflowVersion.Path);
        var promptJson = await CreateApiPromptJsonAsync(appData.ContentRootPath!, appData.Config.BunExePath!, 
            nodeDefinitionPath, workflowPath);
        var apiPrompt = ConvertToApiPrompt(promptJson, clientId, workflow);
        return new ApiPromptResult(apiPrompt, workflow, promptJson);
    }

    public static ApiPrompt ConvertToApiPrompt(string promptJson, string? clientId = null, Dictionary<string,object?>? workflow = null)
    {
        var prompt = promptJson.FromJson<Dictionary<string, ApiNode>>();
        var apiPrompt = new ApiPrompt
        {
            ClientId = clientId,
            Prompt = prompt,
            ExtraData = new()
            {
                ["extra_pnginfo"] = new Dictionary<string, object?>
                {
                    ["workflow"] = workflow
                },
                ["client_id"] = clientId,
            }
        };
        return apiPrompt;
    }

    public static async Task<string> CreateApiPromptJsonAsync(string contentRootPath, string exePath, string nodeDefinitionPath, string workflowPath)
    {
        if (!File.Exists(nodeDefinitionPath))
            throw HttpError.NotFound("object_info.json was not found");
        if (!File.Exists(workflowPath))
            throw HttpError.NotFound($"Workflow {workflowPath} does not exist");

        var processInfo = new ProcessStartInfo
        {
            WorkingDirectory = contentRootPath,
            FileName = exePath,
            Arguments = $"./to-api-prompt.ts {nodeDefinitionPath.Quoted()} {workflowPath.Quoted()}",
        };
        var sb = StringBuilderCache.Allocate();
        var sbError = StringBuilderCacheAlt.Allocate();

        await ProcessUtils.RunAsync(processInfo, 2000,
            onOut: data => sb.AppendLine(data),
            onError: data => sbError.AppendLine(data)).ConfigAwait();
        
        var stdout = StringBuilderCache.ReturnAndFree(sb).Trim();
        var stderr = StringBuilderCacheAlt.ReturnAndFree(sbError);

        var promptJson = stdout.StartsWith('{')
            ? stdout
            : throw new Exception($"Failed to convert workflow to API Prompt:\n{stderr}\n{stdout}");
        return promptJson;
    }
}