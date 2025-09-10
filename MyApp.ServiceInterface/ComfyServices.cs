using System.Data;
using System.Net;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MyApp.ServiceInterface.Commands;
using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.Data;
using ServiceStack.Host;
using ServiceStack.Jobs;
using ServiceStack.OrmLite;
using ServiceStack.Text;

namespace MyApp.ServiceInterface;

public class ComfyServices(ILogger<ComfyServices> log,
    AppData appData, 
    ComfyMetadata metadata, 
    ComfyGateway comfyGateway,
    IBackgroundJobs jobs, 
    IDbConnectionFactory dbFactory,
    AgentEventsManager agentManager,
    IComfyWorkflowConverter comfyConverter,
    NodeComfyWorkflowConverter nodeConverter)
    : Service
{
    public const string ComfyBaseUrl = "http://localhost:7860/api";
    public const string ComfyApiKey = "";
    private static long Counter;

    public object Get(GetAppData request)
    {
        var visibleAgents = appData.GetVisibleComfyAgents();
        var ret = new GetAppDataResponse
        {
            AssetCount = appData.Assets.Count,
            WorkflowCount = appData.Workflows.Count,
            AgentEventCounts = agentManager.GetAgentEventsCount(),
            Agents = visibleAgents.Map(x => x.ToAgentInfo()),
            QueuedAiTasks = agentManager.AiTasks.Values.Map(x => x.ConvertTo<AiTaskInfo>()),
            DefaultGatewayNodes = appData.DefaultGatewayNodes,
        };

        return ret;
    }

    public object Post(UpdateDevice request)
    {
        var agent = appData.GetComfyAgentFor(Db, request.DeviceId, Request.GetClaimsPrincipal());

        if (request.AddModelSettings != null)
        {
            agent.ModelSettings ??= [];
            foreach (var entry in request.AddModelSettings)
            {
                if (entry.Value == null)
                {
                    agent.ModelSettings.Remove(entry.Key);
                }
                else
                {
                    if (entry.Value.MaxBatchSize > 4)
                        entry.Value.MaxBatchSize = 4;
                    if (entry.Value.MaxBatchSize < 0)
                        entry.Value.MaxBatchSize = 0;
                    agent.ModelSettings[entry.Key] = entry.Value;
                }
            }
            Db.UpdateOnly(() => new ComfyAgent {
                ModelSettings = agent.ModelSettings,
            }, where: x => x.DeviceId == request.DeviceId);
        }
        
        return agent.ToOwnerAgentInfo();
    }
    
    public object Patch(UpdateComfyAgentSettings request)
    {
        var now = DateTime.UtcNow;

        var agent = appData.GetComfyAgentFor(Db, request.DeviceId, Request.GetClaimsPrincipal());
        agent.Settings.PreserveOutputs = request.PreserveOutputs ?? agent.Settings.PreserveOutputs;
        agent.Settings.InDevicePool = request.InDevicePool ?? agent.Settings.InDevicePool;
        agent.DevicePool = agent.Settings.InDevicePool == true 
            ? agent.DevicePool ?? now
            : null;
        
        Db.UpdateOnly(() => new ComfyAgent
        {
            Settings = agent.Settings,
            DevicePool = agent.DevicePool,
            ModifiedDate = now,
        }, where: x => x.DeviceId == request.DeviceId);
        
        return new UpdateComfyAgentSettingsResponse {
            Result = agent.ToOwnerAgentInfo()
        };
    }

    public async Task<object> Get(DevicePool request)
    {
        var userId = Request.GetUserId();
        var isAdmin = Request.GetClaimsPrincipal().IsAdmin();
        
        var visibleAgents = appData.GetVisibleComfyAgents()
            .Where(x => x.DevicePool != null)
            .ToList();
        
        if (request.AfterModifiedDate != null)
        {
            var startedAt = DateTime.UtcNow;
            var waitFor = TimeSpan.FromSeconds(30);
            List<ComfyAgent> userAgents;
            do
            {
                await Task.Delay(200);
                userAgents = appData.GetVisibleComfyAgents()
                    .Where(x => x.DevicePool != null)
                    .ToList();
            } while (userAgents.Count == 0 || userAgents.Max(x => x.ModifiedDate) < startedAt || DateTime.UtcNow - startedAt < waitFor);
        }
        
        return new QueryResponse<AgentInfo>
        {
            Total = visibleAgents.Count,
            Results = visibleAgents.Select(x => x.UserId == userId || isAdmin 
                ? x.ToOwnerAgentInfo()
                : x.ToAgentInfo()).ToList(),
        };
    }
    
    public async Task<object> Get(MyDevices request)
    {
        var userId = Request.GetRequiredUserId();
        
        if (request.AfterModifiedDate != null)
        {
            var startedAt = DateTime.UtcNow;
            var waitFor = TimeSpan.FromSeconds(30);
            List<ComfyAgent> userAgents;
            do
            {
                await Task.Delay(500);
                userAgents = appData.GetVisibleComfyAgents()
                    .Where(x => x.UserId == userId)
                    .ToList();
            } while (userAgents.Count == 0 || userAgents.Max(x => x.ModifiedDate) < startedAt || DateTime.UtcNow - startedAt < waitFor);
        }

        var activeAgents = appData.GetVisibleComfyAgents().ToList();
        var userDevices = await Db.SelectAsync<ComfyAgent>(x => x.UserId == userId);
        userDevices.Each(agent =>
        {
            var activeAgent = activeAgents.FirstOrDefault(x => x.DeviceId == agent.DeviceId);
            agent.LastUpdate = activeAgent?.LastUpdate ?? agent.ModifiedDate;
            if (activeAgent != null)
            {
                agent.LastUpdate = activeAgent.LastUpdate;
            }
            else
            {
                agent.OfflineDate = agent.LastUpdate = agent.ModifiedDate;
                agent.Gpus.Each(gpu => gpu.Used = 0);
            }
        });
        var results = userDevices.Map(x => x.ToOwnerAgentInfo());
        return new QueryResponse<OwnerAgentInfo>
        {
            Total = appData.ComfyAgents.Count,
            Results = results,
        };
    }

    public object Post(RemoveDevice request)
    {
        var userId = Request.GetRequiredUserId();
        var agent = Db.SingleById<ComfyAgent>(request.Id);
        if (agent == null)
            throw HttpError.NotFound("Device not found");
        if (agent.UserId != userId && !Request.GetClaimsPrincipal().IsAdmin())
            throw HttpError.Conflict("Device does not belong to you");

        appData.RemoveAgent(agent.DeviceId);
        agentManager.RemoveAgent(agent.DeviceId);
        Db.DeleteById<ComfyAgent>(request.Id);
        
        return new EmptyResponse();
    }
    
    public async Task<object> GetAsync(GetComfyTasks request)
    {
        await Task.Delay(5_000); // simulate delay
        return new ComfyTasksResponse
        {
            Results = [
                new ComfyTask
                {
                    Id = Interlocked.Increment(ref Counter),
                    Name = $"{DateTime.UtcNow:T}",
                }
            ]
        };
    }

    public List<string> Get(GetWorkflowPaths request)
    {
        var workflowsPath = appData.WebRootPath.CombineWith("data", "workflows");
        var files = Directory.GetFiles(workflowsPath, "*.json", SearchOption.AllDirectories);

        var allWorkflows = files.Map(x => x[workflowsPath.Length..].TrimStart('/'));

        var overrideWorkflowPath = appData.OverridesPath.CombineWith("workflows");

        if (Directory.Exists(overrideWorkflowPath))
        {
            var overrideFiles =  Directory.GetFiles(overrideWorkflowPath, "*.json", SearchOption.AllDirectories);

            allWorkflows.AddRange(overrideFiles.Map(x => x[overrideWorkflowPath.Length..].TrimStart('/')));
        }

        allWorkflows.Sort();

        return allWorkflows;
    }

    public WorkflowVersion GetWorkflowVersion(int? versionId, int? workflowId)
    {
        // If versionId is specified, get that version, otherwise get the pinned version of the workflow
        var workflowVersion = versionId != null
            ? Db.SingleById<WorkflowVersion>(versionId)
            : null;
        
        if (workflowVersion == null && workflowId != null)
        {
            var workflow = Db.SingleById<Workflow>(workflowId);
            if (workflow == null)
                throw HttpError.NotFound("Workflow not found");
            // Should always have a pinned versionId
            workflowVersion = workflow.PinVersionId != null 
                ? Db.SingleById<WorkflowVersion>(workflow.PinVersionId)
                : Db.Single(Db.From<WorkflowVersion>()
                    .Where(x => x.ParentId == workflowId)
                    .OrderByDescending(x => x.Id));
        }
        
        if (workflowVersion == null)
            throw HttpError.NotFound("Workflow not found");

        return workflowVersion;
    }

    public object Get(GetWorkflowVersion request)
    {
        var workflowVersion = GetWorkflowVersion(request.VersionId, request.WorkflowId);
        return new GetWorkflowVersionResponse
        {
            Result = workflowVersion
        };
    }

    public object Get(GetWorkflowInfo request)
    {
        var workflowVersion = GetWorkflowVersion(request.VersionId, request.WorkflowId);

        var info = workflowVersion.Info;
        info.Id = workflowVersion.Id;
        info.ParentId = workflowVersion.ParentId;
        return new GetWorkflowInfoResponse
        {
            Result = info
        };
    }

    public async Task Get(DownloadWorkflowVersion request)
    {
        var version = await Db.SingleByIdAsync<WorkflowVersion>(request.Id)
            ?? throw HttpError.NotFound("Workflow not found");
        var name = version.Name
           ?? await Db.ScalarAsync<string>(Db.From<Workflow>()
               .Where(x => x.Id == version.ParentId)
               .Select(x => x.Name))
           ?? "Workflow";
        var fileName = $"{name}.json";
        
        var json = JSON.stringify(version.Workflow);

        Response.ContentType = "application/json";
        Response.AddHeader(HttpHeaders.ContentDisposition,
            $"attachment; {HttpExt.GetDispositionFileName(fileName)}; size={json.Length}; " +
            $"creation-date={version.CreatedDate.ToString("R").Replace(",", "")}; " +
            $"modification-date={version.ModifiedDate.ToString("R").Replace(",", "")}; "
        );
        await Response.OutputStream.WriteAsync(json);
        await Response.EndRequestAsync();
    }

    public async Task<WorkflowInfo> GetWorkflowInfoAsync(string path)
    {
        path = path.Replace('\\', '/');
        var workflowJson = await GetWorkflowJsonAsync(path);

        if (workflowJson == null)
            throw HttpError.NotFound("Workflow not found");

        var workflowInfo = ComfyWorkflowParser.Parse(workflowJson.ParseAsObjectDictionary(), path, metadata.DefaultNodeDefinitions);
        return workflowInfo;
    }

    private async Task<string?> GetWorkflowJsonAsync(string path)
    {
        path = path.Replace('\\', '/');
        var workflowsPath = appData.WebRootPath.CombineWith("lib", "data", "workflows");
        if (!path.IsPathSafe(workflowsPath))
            throw new ArgumentNullException("Workflow", "Invalid Workflow Path");

        var overridePath = appData.OverridesPath.CombineWith("workflows").Replace('\\', '/');
        string? workflowJson = null;

        if (File.Exists(overridePath.CombineWith(path)))
        {
            workflowJson = await File.ReadAllTextAsync(overridePath.CombineWith(path));
        }
        else if (File.Exists(workflowsPath.CombineWith(path)))
        {
            workflowJson = await File.ReadAllTextAsync(workflowsPath.CombineWith(path));
        }
        else
        {
            if (File.Exists(overridePath.CombineWith(path)))
            {
                workflowJson = await File.ReadAllTextAsync(overridePath.CombineWith(path));
            }
            else
            {
                var allPaths = Get(new GetWorkflowPaths());
                var matches = allPaths.Where(x => x.EndsWith(path)).ToList();
                if (matches.Count == 1)
                {
                    if (File.Exists(overridePath.CombineWith(matches[0])))
                    {
                        workflowJson = await File.ReadAllTextAsync(overridePath.CombineWith(matches[0]));
                    }
                    else if (File.Exists(workflowsPath.CombineWith(matches[0])))
                    {
                        workflowJson = await File.ReadAllTextAsync(workflowsPath.CombineWith(matches[0]));
                    }
                }
                else if (matches.Count > 1)
                {
                    throw HttpError.Conflict("Multiple matches found");
                }
            }
        }

        return workflowJson;
    }

    // public async Task<object> Get(GetComfyApiPrompt request)
    // {
    //     var client = comfyGateway.CreateHttpClient(ComfyBaseUrl, ComfyApiKey);
    //     var nodeDefs = await metadata.LoadNodeDefinitionsAsync(client);
    //     var workflowInfo = await GetWorkflowInfoAsync(request.Workflow);
    //     
    //     var workflowJson = await GetWorkflowJsonAsync(workflowInfo.Path)
    //             ?? throw HttpError.NotFound("Workflow not found");
    //     var workflow = workflowJson.ParseAsObjectDictionary();
    //     if (request.Args?.Count > 0)
    //     {
    //         var result = ComfyWorkflowParser.MergeWorkflow(workflow, request.Args, workflowInfo);
    //         workflow = result.Result;
    //     }
    //     var apiPrompt = ComfyConverters.ConvertWorkflowToApiPrompt(workflow, nodeDefs, log:log);
    //     return apiPrompt;
    // }

    public async Task<object> Post(RequeueGeneration request)
    {
        var userId = Request.GetRequiredUserId();
        log.LogInformation("Received RequeueGeneration from '{UserId}' to execute Generation '{Id}'",
            userId, request.Id);
        
        var gen = Db.SingleById<WorkflowGeneration>(request.Id);
        if (gen == null)
            throw HttpError.NotFound("Workflow generation could not be found");
            
        log.LogInformation("Re-queueing Workflow generation {GenerationId} for {UserId}", gen.Id, userId);
        
        // Reset the generation
        gen.DeviceId = null;
        gen.PromptId = null;
        gen.Error = null;
        gen.Result = null;
        gen.Status = null;
        gen.Outputs = null;
        gen.ModifiedBy = userId;
        gen.ModifiedDate = DateTime.UtcNow;
        gen.StatusUpdate = GenerationStatus.ReAddedToAgentsPool;

        // If we're retrying an existing generation we need to regenerate the seeds
        if (gen.Args?.Count > 0 && (gen.Args.ContainsKey("seed") || gen.Args.ContainsKey("noise_seed")))
        {
            if (gen.Args.TryGetValue("seed", out var seed))
            {
                gen.Args["seed"] = Random.Shared.NextInt64(0, long.MaxValue);
            }
            if (gen.Args.TryGetValue("noise_seed", out var noiseSeed))
            {
                gen.Args["noise_seed"] = Random.Shared.NextInt64(0, long.MaxValue);
            }
            
            var workflowVersion = GetWorkflowVersion(Db, gen.WorkflowId, gen.VersionId);
            var (apiPrompt, newWorkflow, _) = await comfyConverter.CreateApiPromptAsync(workflowVersion, gen.Args, agent:null, gen.Id);

            gen.Workflow = newWorkflow;
            gen.ApiPrompt = apiPrompt;
            
            Db.UpdateOnly(() => new WorkflowGeneration
            {
                Args = gen.Args,
                Workflow = gen.Workflow,
                ApiPrompt = gen.ApiPrompt,
                DeviceId = gen.DeviceId,
                PromptId = gen.PromptId,
                Error = gen.Error,
                Result = gen.Result,
                Status = gen.Status,
                Outputs = gen.Outputs,
                StatusUpdate = gen.StatusUpdate,
                ModifiedBy = gen.ModifiedBy,
                ModifiedDate = gen.ModifiedDate,
            }, where: x => x.Id == request.Id);
        }
        else
        {
            Db.UpdateOnly(() => new WorkflowGeneration
            {
                DeviceId = gen.DeviceId,
                PromptId = gen.PromptId,
                Error = gen.Error,
                Result = gen.Result,
                Status = gen.Status,
                Outputs = gen.Outputs,
                StatusUpdate = gen.StatusUpdate,
                ModifiedBy = gen.ModifiedBy,
                ModifiedDate = gen.ModifiedDate,
            }, where: x => x.Id == request.Id);
        }
        
        agentManager.QueueGeneration(gen);

        return new RequeueGenerationResponse
        {
            Id = gen.Id,
        };
    }

    private static WorkflowVersion GetWorkflowVersion(IDbConnection db, int workflowId, int? versionId=null)
    {
        var q = versionId != null
            ? db.From<WorkflowVersion>().Where(x => x.Id == versionId && x.ParentId == workflowId)
            : db.From<WorkflowVersion>()
                .Where(x => x.ParentId == workflowId)
                .OrderByDescending(x => x.Id);

        var workflowVersion = db.Single(q);
        if (workflowVersion == null)
            throw HttpError.NotFound("Workflow version not found");
        return workflowVersion;
    }

    public async Task<object> Post(QueueWorkflow request)
    {
        using var db = Db;
        var userId = Request.GetClaimsPrincipal().GetUserId();
        log.LogInformation("Received QueueComfyWorkflow from '{UserId}' to execute workflow '{Workflow}'",
            userId, request.WorkflowId);

        request.Args.AssertValidArgs(appData.Config.MaxLimits);
        
        var clientId = Guid.NewGuid().ToString("N");
        var workflowVersion = GetWorkflowVersion(db, request.WorkflowId, request.VersionId);

        var requiredNodes = ComfyWorkflowParser.ExtractRequiredNodeTypes(workflowVersion.Workflow, appData.DefaultGatewayNodes, log);
        var requiredAssets = ComfyWorkflowParser.ExtractAssetPaths(workflowVersion.Workflow, log);
        
        var agent = request.DeviceId != null
            ? appData.GetComfyAgent(new(DeviceId:request.DeviceId))
            : appData.GetSupportedAgent(requiredNodes, requiredAssets);
        var (apiPrompt, workflow, _) = await comfyConverter.CreateApiPromptAsync(workflowVersion, request.Args!, agent, clientId);

        log.LogInformation("Queueing ComfyUI Workflow for {ClientId}: {ApiPromptJson}", 
            apiPrompt.ClientId, ClientConfig.ToSystemJson(apiPrompt.Prompt));

        var checkpoint = requiredAssets.FirstOrDefault(x => 
            x.StartsWith("checkpoints/") || x.StartsWith("diffusion_models/") || x.StartsWith("unet/") || 
            x.StartsWith("Stable-diffusion/", StringComparison.OrdinalIgnoreCase));
        var lora = requiredAssets.FirstOrDefault(x => x.StartsWith("loras/", StringComparison.OrdinalIgnoreCase));
        var embedding = requiredAssets.FirstOrDefault(x => x.StartsWith("embeddings/", StringComparison.OrdinalIgnoreCase));
        var vae = requiredAssets.FirstOrDefault(x => x.StartsWith("vae/", StringComparison.OrdinalIgnoreCase));
        var controlNet = requiredAssets.FirstOrDefault(x => x.StartsWith("controlnet/, StringComparison.OrdinalIgnoreCase"));
        var upscaler = requiredAssets.FirstOrDefault(x => x.StartsWith("upscale_models/", StringComparison.OrdinalIgnoreCase));

        List<string>? inputs = null;
        if (Request!.Files.Length > 0)
        {
            for (var i = 0; i < Request.Files.Length; i++)
            {
                var file = Request.Files[i];
                var input = workflowVersion.Info.Inputs.FirstOrDefault(x => x.Name == file.Name);
                if (input == null)
                    throw HttpError.BadRequest($"Workflow does not have an '{file.Name}' input");

                var fileName = await appData.SaveUploadedFileAsync(file);
                inputs ??= [];
                inputs.Add(fileName);
                
                var node = apiPrompt.Prompt[input.NodeId.ToString()];
                node.Inputs[input.Name] = fileName;
            }
        }
        else
        {
            if (request.Args?.TryGetValue("image", out var oFileName) == true && oFileName is string fileName)
            {
                var input = workflowVersion.Info.Inputs.FirstOrDefault(x => x.Name == "image");
                if (input != null)
                {
                    var node = apiPrompt.Prompt[input.NodeId.ToString()];
                    var artifactPath = appData.GetArtifactPath(fileName);
                    if (!File.Exists(artifactPath))
                        throw HttpError.NotFound($"Artifact not found: {fileName}");
                    
                    var inputPath = appData.Config.FilesPath.CombineWith(fileName[..2], fileName);
                    Path.GetDirectoryName(inputPath).AssertDir();
                    if (!File.Exists(inputPath))
                    {
                        File.Copy(artifactPath, inputPath);
                    }
                    
                    inputs ??= [];
                    inputs.Add(fileName);
                    node.Inputs["image"] = fileName;
                }
            }
        }
        
        var now = DateTime.UtcNow;
        var generation = new WorkflowGeneration
        {
            Id = clientId,
            UserId = userId,
            DeviceId = request.DeviceId,
            ThreadId = request.ThreadId,
            WorkflowId = request.WorkflowId,
            VersionId = request.VersionId,
            Description = request.Description,
            Checkpoint = checkpoint?.RightPart('/').LastLeftPart('.'),
            Lora = lora?.RightPart('/').LastLeftPart('.'),
            Embedding = embedding?.RightPart('/').LastLeftPart('.'),
            Vae = vae?.RightPart('/').LastLeftPart('.'),
            ControlNet = controlNet?.RightPart('/').LastLeftPart('.'),
            Upscaler = upscaler?.RightPart('/').LastLeftPart('.'),
            Args = request.Args,
            Workflow = workflow,
            ApiPrompt = apiPrompt,
            Inputs = inputs,
            RequiredNodes = requiredNodes,
            RequiredAssets = requiredAssets,
            CreatedBy = userId,
            CreatedDate = now,
            ModifiedBy = userId,
            ModifiedDate = now,
            StatusUpdate = GenerationStatus.InAgentsPool,
        };

        db.Insert(generation);
        
        agentManager.QueueGeneration(generation);

        return new QueueWorkflowResponse
        {
            Id = clientId,
        };
    }

    public object Get(GetGenerationApiPrompt request)
    {
        var generation = Db.AssertGeneration(request.Id);
        var apiPrompt = generation.ApiPrompt;
        
        // Apply any model limits for the device this generation is assigned to
        var agent = appData.GetComfyAgentByDeviceId(Db, generation.DeviceId);
        if (agent?.ModelSettings != null)
        {
            foreach (var asset in generation.RequiredAssets.Safe())
            {
                if (agent.ModelSettings.TryGetValue(asset, out var settings))
                {
                    if (settings.MaxBatchSize == null)
                        continue;
                    if (settings.MaxBatchSize == 0)
                        throw HttpError.BadRequest($"Model {asset} is not available on this device");

                    // Reduce batch size to max allowed
                    foreach (var node in apiPrompt.Prompt)
                    {
                        if (node.Value.Inputs.TryGetValue("batch_size", out var batchSize))
                        {
                            // Node Input Values are strings in Workflow API Prompts
                            log.LogInformation("🔧 Reducing batch size to {MaxBatchSize} for {Asset} on {DeviceId}",
                                settings.MaxBatchSize, asset, generation.DeviceId);
                            node.Value.Inputs["batch_size"] = Math.Min(
                                batchSize.ConvertTo<int>(), settings.MaxBatchSize.Value).ToString();
                        }
                    }
                }
            }
        }
        
        return apiPrompt;
    }
    
    public async Task<object> Get(GetExecutedWorkflowResults request)
    {
        var startedAt = DateTime.UtcNow;
        var waitForSecs = request.Poll == true
            ? 60
            : 0;

        WorkflowResult? GetGenerationResult()
        {
            var generation = Db.AssertGeneration(request.Id);
            if (generation.Result != null)
                return generation.Result;
            if (generation.Error != null)
                throw new HttpError(generation.Error, HttpStatusCode.InternalServerError);
            if (DateTime.UtcNow - generation.CreatedDate > TimeSpan.FromMinutes(10))
                throw new HttpError(new ResponseStatus("Timeout", "Workflow execution timed out"), 
                    HttpStatusCode.InternalServerError);
            return null;
        }

        var generation = GetGenerationResult();
        if (generation != null)
            return new GetExecutedWorkflowResultsResponse { Result = generation };

        var timeRemainingMs = waitForSecs > 0 
            ? waitForSecs * 1000 - (int) (DateTime.UtcNow - startedAt).TotalMilliseconds
            : 0;
        await agentManager.WaitForUpdatedGenerationAsync(timeRemainingMs);
        generation = GetGenerationResult();
        if (generation != null)
            return new GetExecutedWorkflowResultsResponse { Result = generation };

        return new GetExecutedWorkflowResultsResponse();
    }
    
    public async Task<object> Get(GetExecutedWorkflowsResults request)
    {
        if (request.Ids == null || request.Ids.Count == 0)
            throw new ArgumentNullException(nameof(request.Ids));

        var ret = new GetExecutedWorkflowsResultsResponse
        {
            Results = [],
            Errors = [],
        };
        
        var startedAt = DateTime.UtcNow;
        var waitForSecs = request.Poll == true
            ? 60
            : 0;

        do
        {
            var generations = Db.SelectByIds<WorkflowGeneration>(request.Ids);
            foreach (var generation in generations)
            {
                var error = generation.Error;
                if (error != null)
                {
                    ret.Errors[generation.Id] = error;
                }
                else
                {
                    var result = generation?.Result;
                    if (result != null)
                    {
                        ret.Results[generation.Id] = result;
                    }
                }
            }
            // Add missing generation as error messages
            foreach (var id in request.Ids)
            {
                if (generations.All(x => x.Id != id))
                {
                    ret.Errors[id] = new ResponseStatus(
                        "NotFound", "Workflow execution could not be found");
                }
            }
            if (ret.Results.Count > 0 || ret.Errors.Count > 0)
                return ret;

            var timeRemainingMs = waitForSecs > 0 
                ? waitForSecs * 1000 - (int) (DateTime.UtcNow - startedAt).TotalMilliseconds
                : 0;
            if (timeRemainingMs <= 0)
                break;
            await agentManager.WaitForUpdatedGenerationAsync(timeRemainingMs);
        } while(true);
        return ret;
    }

    public async Task<object> Get(WaitForMyWorkflowGenerations request)
    {
        using var db = Db;
        var lastModifiedDate = request.AfterModifiedDate;
        if (lastModifiedDate == null)
        {
            lastModifiedDate = db.Scalar<DateTime>(
                db.From<WorkflowGeneration>()
                    .Where(x => request.Ids.Contains(x.Id))
                    .Select(x => Sql.Max(x.ModifiedDate)));
        }
        
        var q = db.From<WorkflowGeneration>()
            .Where(x => x.ModifiedDate > lastModifiedDate);

        if (request.ThreadId != null)
        {
            q.And(x => x.ThreadId == request.ThreadId);
        }
        if (request.Ids?.Count > 0)
        {
            q.And(x => request.Ids.Contains(x.Id));
        }

        var startedAt = DateTime.UtcNow;
        var waitForSecs = 120;
        do
        {
            var updatedGenerations = db.Select(q);
            if (updatedGenerations.Count > 0)
                return new QueryResponse<WorkflowGeneration> { Results = updatedGenerations };

            var timeRemainingMs = waitForSecs * 1000 - (int) (DateTime.UtcNow - startedAt).TotalMilliseconds;
            if (timeRemainingMs <= 0)
                break;
            await agentManager.WaitForUpdatedGenerationAsync(timeRemainingMs);
        } while(true);
        return new QueryResponse<WorkflowGeneration> { Results = [] };
    }

    public object Post(UpdateGenerationAsset request)
    {
        using var db = Db;
        var gen = db.AssertGeneration(request.GenerationId);

        var asset = gen.Result?.Assets?.Find(x => x.Url == request.AssetUrl);
        if (asset == null)
            throw HttpError.NotFound("Asset could not be found");

        var now = DateTime.UtcNow;
        var userId = Request.GetRequiredUserId();
        asset.Rating = request.Rating;

        db.UpdateOnly(() => new WorkflowGeneration {
            Result = gen.Result,
            ModifiedBy = userId,
            ModifiedDate = now,
        }, where:x => x.Id == request.GenerationId);
        db.UpdateOnly(() => new Artifact
        {
            Rating = asset.Rating,
            ModifiedBy = userId,
            ModifiedDate = now,
        }, where:x => x.Url == request.AssetUrl);
        return new EmptyResponse();
    }

    public object Any(DeleteWorkflowGenerationArtifact request)
    {
        using var db = Db;
        var gen = db.AssertGeneration(request.GenerationId);

        var asset = gen.Result?.Assets?.Find(x => x.Url == request.AssetUrl);
        if (asset == null)
            throw HttpError.NotFound("Asset could not be found");

        var now = DateTime.UtcNow;
        var userId = Request.AssertValidUser(gen.CreatedBy);
        
        var artifacts = Db.Select(Db.From<Artifact>()
            .Where(x => x.Url == request.AssetUrl));

        // Can only delete file if there's only 1 reference
        if (artifacts.Count == 1)
        {
            appData.DeleteArtifact(db, artifacts[0]);
        }
        else if (artifacts.Count > 1)
        {
            log.LogWarning("Found {Count} artifacts for {AssetUrl}", artifacts.Count, request.AssetUrl);
        }
        
        if (gen.Result?.Assets?.Count > 0)
        {
            gen.Result.Assets = gen.Result.Assets.Where(x => x.Url != request.AssetUrl).ToList();
        }

        // Delete the artifact referenced by this generation
        var deleteArtifactIds = Db.Column<int>(Db.From<Artifact>()
            .Where(x => x.GenerationId == request.GenerationId && x.Url == request.AssetUrl).Select(x => x.Id));
        db.DeleteByIds<Artifact>(deleteArtifactIds);
        db.BulkInsert(deleteArtifactIds.Map(x => new DeletedRow { Table = Table.Artifact, Key = $"{x}" }));
        
        var hasAssets = gen.Result?.Assets?.Count > 0 &&
                        db.Count<Artifact>(x => x.GenerationId == request.GenerationId) > 0;
        if (!hasAssets)
        {
            gen.DeletedBy = userId;
            gen.DeletedDate = now;
        }

        if (gen.DeletedDate != null)
        {
            db.DeleteById<WorkflowGeneration>(gen.Id);
            db.Insert(new DeletedRow { Table = Table.WorkflowGeneration, Key = gen.Id });
        }
        else
        {
            // Remove the asset from the generation results
            db.UpdateOnly(() => new WorkflowGeneration {
                Result = gen.Result,
                ModifiedBy = userId,
                ModifiedDate = now,
            }, where:x => x.Id == request.GenerationId);
        }

        return gen;
    }

    public object Any(PinWorkflowGenerationArtifact request)
    {
        using var db = Db;
        var gen = db.AssertGeneration(request.GenerationId);

        var asset = gen.Result?.Assets?.Find(x => x.Url == request.AssetUrl);
        if (asset == null)
            throw HttpError.NotFound("Asset could not be found");

        // Move asset to the front of the list
        if (gen.Result!.Assets!.Count > 1)
        {
            gen.Result.Assets.Remove(asset);
            gen.Result.Assets.Insert(0, asset);
        }
        
        var now = DateTime.UtcNow;
        var userId = Request.AssertValidUser(gen.CreatedBy);

        // Remove the asset from the generation results
        db.UpdateOnly(() => new WorkflowGeneration {
            Result = gen.Result,
            PosterImage = asset.Url,
            ModifiedBy = userId,
            ModifiedDate = now,
        }, where:x => x.Id == request.GenerationId);
        
        return new EmptyResponse();
    }

    public object Any(PublishWorkflowGeneration request)
    {
        using var db = Db;
        var gen = db.AssertGeneration(request.Id);
        var now = DateTime.UtcNow;
        var userId = Request.AssertValidUser(gen.CreatedBy);

        var genArtifacts = db.Select<Artifact>(x => x.GenerationId == request.Id);
        if (genArtifacts.Count == 0)
            throw HttpError.NotFound("No artifacts found for this generation");

        if (gen.PosterImage == null)
        {
            foreach (var asset in gen.Result?.Assets ?? [])
            {
                var artifact = genArtifacts.Find(x => x.Url == asset.Url);
                if (artifact != null)
                {
                    gen.PosterImage = asset.Url;
                    break;
                }
            }
            gen.PosterImage ??= genArtifacts[0].Url;
        }
        
        var posterArtifact = genArtifacts.Find(x => x.Url == gen.PosterImage);
        if (posterArtifact != null)
        {
            db.UpdateOnly(() => new Artifact {
                PublishedBy = userId,
                PublishedDate = now,
                ModifiedBy = userId,
                ModifiedDate = now,
            }, where:x => x.Id == posterArtifact.Id);
        }
    
        db.UpdateOnly(() => new WorkflowGeneration {
            PosterImage = gen.PosterImage,
            PublishedBy = userId,
            PublishedDate = now,
            ModifiedBy = userId,
            ModifiedDate = now,
        }, where:x => x.Id == request.Id);
        
        return new EmptyResponse();
    }

    public object Get(GetWorkflowGeneration request)
    {
        var isAdmin = Request.GetClaimsPrincipal()?.IsAdmin() == true;
        var gen = Db.AssertGeneration(request.Id);
        if (gen.PublishedDate == null && !isAdmin)
            throw HttpError.NotFound("Generation does not exist");

        var artifacts = appData.PopulateArtifacts(Db, Db.Select<Artifact>(x => x.GenerationId == request.Id));
        appData.PopulateGenerations(Db, [gen]);

        return new GetWorkflowGenerationResponse
        {
            Result = gen,
            Artifacts = artifacts,
        };
    }

    public object Any(MoveGeneration request)
    {
        using var db = Db;
        var isAdmin = Request.GetClaimsPrincipal()?.IsAdmin() == true;
        var gen = Db.AssertGeneration(request.GenerationId);
        var userId = Request.AssertValidUser(gen.CreatedBy);
        var now = DateTime.UtcNow;

        db.UpdateOnly(() => new WorkflowGeneration {
            ThreadId = request.ThreadId,
            ModifiedBy = userId,
            ModifiedDate = now,
        }, where:x => x.Id == request.GenerationId);
        
        return new EmptyResponse();
    }

    public object Post(PinToWorkflowVersion request)
    {
        using var db = Db;
        var now = DateTime.UtcNow;
        var userId = Request.GetRequiredUserId();

        db.UpdateOnly(() => new WorkflowVersion {
            PosterImage = request.PosterImage,
            ModifiedBy = userId,
            ModifiedDate = now,
        }, where:x => x.Id == request.VersionId);

        return new EmptyResponse();
    }

    public async Task<object> Post(FeatureArtifact request)
    {
        var now = DateTime.UtcNow;
        var userId = Request.GetRequiredUserId();

        if (appData.Config.FeaturedUserIds.Length > 0)
        {
            await Db.UpdateOnlyAsync(() => new Artifact {
                ModifiedBy = userId,
                ModifiedDate = now,
                PublishedBy = appData.Config.FeaturedUserIds[0],
            }, where:x => x.Id == request.ArtifactId);
        }

        return await Db.SingleByIdAsync<Artifact>(request.ArtifactId);
    }

    public async Task<object> Post(UnFeatureArtifact request)
    {
        var now = DateTime.UtcNow;
        var userId = Request.GetRequiredUserId();

        await Db.UpdateOnlyAsync(() => new Artifact {
            ModifiedBy = userId,
            ModifiedDate = now,
            PublishedBy = appData.Config.SystemUserId,
        }, where:x => x.Id == request.ArtifactId);

        return await Db.SingleByIdAsync<Artifact>(request.ArtifactId);
    }

    public async Task<object> Post(UpdateWorkflowVersion request)
    {
        using var db = Db;
        var now = DateTime.UtcNow;
        var userId = Request.GetRequiredUserId();
        
        var version = db.SingleById<WorkflowVersion>(request.VersionId);
        if (Request.Files.Length == 0)
            throw HttpError.BadRequest("No file uploaded");

        var workflowJson = await Request.Files[0].InputStream.ReadToEndAsync();
        var workflow = db.SingleById<Workflow>(version.ParentId);

        var parsedWorkflow = appData.TryParseWorkflow(workflowJson, version.Name, workflow.Base, version.Version)
            ?? throw HttpError.BadRequest("Failed to parse workflow");
        
        var saveToPath = appData.WorkflowsPath.CombineWith(version.Path);
        Path.GetDirectoryName(saveToPath).AssertDir();
        await File.WriteAllTextAsync(saveToPath, workflowJson);
        
        var clientId = version.Workflow.TryGetValue("Id", out var oId) && oId is string id
            ? id
            : Guid.NewGuid().ToString("N");
        var (apiPrompt, _, promptJson) = await nodeConverter.CreateApiPromptAsync(version, new(), agent:null, clientId);
        
        version.ApiPrompt = apiPrompt.Prompt;
        version.Workflow = parsedWorkflow.Workflow;
        version.Info = parsedWorkflow.Info;
        version.Nodes = parsedWorkflow.Nodes;
        version.Assets = parsedWorkflow.Assets;
        version.ModifiedBy = userId;
        version.ModifiedDate = now;
        
        var updated = await db.UpdateOnlyAsync(() => new WorkflowVersion {
            Workflow = version.Workflow,
            Info = version.Info,
            ApiPrompt = version.ApiPrompt,
            Nodes = version.Nodes,
            Assets = version.Assets,
            ModifiedBy = version.ModifiedBy,
            ModifiedDate = version.ModifiedDate,
        }, where:x => x.Id == request.VersionId);

        appData.AddWorkflowVersion(version);

        var infoPath = appData.WorkflowInfosPath.CombineWith(version.Path);
        Path.GetDirectoryName(infoPath).AssertDir();
        await File.WriteAllTextAsync(infoPath, parsedWorkflow.Info.ToJson());

        var apiPromptPath = appData.WorkflowApiPromptsPath.CombineWith(version.Path);
        Path.GetDirectoryName(apiPromptPath).AssertDir();
        await File.WriteAllTextAsync(apiPromptPath, promptJson);

        return new UpdateWorkflowVersionResponse
        {
            VersionId = request.VersionId,
            Updated = updated,
            Nodes = parsedWorkflow.Nodes,
            Assets = parsedWorkflow.Assets,
            Info = parsedWorkflow.Info,
        };
    }

    public async Task<object> Post(ParseWorkflowVersions request)
    {
        using var db = Db;
        var now = DateTime.UtcNow;
        var userId = Request.GetRequiredUserId();
        var ret = new StringsResponse();

        var allVersions = Db.Select<WorkflowVersion>();
        var allWorkflows = Db.Select<Workflow>();
        
        if (request.VersionId != null)
        {
            allVersions = allVersions.Where(x => x.Id == request.VersionId).ToList();
        }
        
        foreach (var version in allVersions)
        {
            var workflow = allWorkflows.Find(x => x.Id == version.ParentId);
            if (workflow == null)
            {
                ret.Results.Add($"Workflow not found for version {version.Id}");
                continue;
            }

            try
            {
                var workflowJson = await File.ReadAllTextAsync(appData.WorkflowsPath.CombineWith(version.Path));

                var parsedWorkflow = appData.ParseWorkflow(workflowJson, version.Name, workflow.Base, version.Version);
                version.Workflow = parsedWorkflow.Workflow;
                version.Info = parsedWorkflow.Info;
                version.Nodes = parsedWorkflow.Nodes;
                version.Assets = parsedWorkflow.Assets;

                var clientId = version.Workflow.TryGetValue("Id", out var oId) && oId is string id
                    ? id
                    : Guid.NewGuid().ToString("N");

                var (apiPrompt, _, promptJson) = await nodeConverter.CreateApiPromptAsync(version, new(), agent:null, clientId);
                version.ApiPrompt = apiPrompt.Prompt;
                
                await db.UpdateOnlyAsync(() => new WorkflowVersion {
                    Workflow = version.Workflow,
                    Info = version.Info,
                    ApiPrompt = version.ApiPrompt,
                    Nodes = version.Nodes,
                    Assets = version.Assets,
                    ModifiedBy = userId,
                    ModifiedDate = now,
                }, where:x => x.Id == version.Id);

                var infoPath = appData.WorkflowInfosPath.CombineWith(version.Path);
                Path.GetDirectoryName(infoPath).AssertDir();
                await File.WriteAllTextAsync(infoPath, parsedWorkflow.Info.ToJson());

                var apiPromptPath = appData.WorkflowApiPromptsPath.CombineWith(version.Path);
                Path.GetDirectoryName(apiPromptPath).AssertDir();
                await File.WriteAllTextAsync(apiPromptPath, promptJson);
                
                ret.Results.Add($"Workflow {version.Id} updated with {parsedWorkflow.Nodes.Count} nodes and {parsedWorkflow.Assets.Count} assets");
            }
            catch (Exception e)
            {
                ret.Results.Add($"Failed to parse {version.Path}: {e.Message}");
            }
        }

        return ret;
    }

    public async Task<object> Post(ParseWorkflow request)
    {
        var uploadedFile = Request!.Files.Length > 0
            ? Request.Files[0]
            : null;
        var workflowJson = request.Json 
            ?? (uploadedFile != null
                ? await Request.Files[0].InputStream.ReadToEndAsync()
                : null)
            ?? throw HttpError.BadRequest("No Workflow provided");
        
        var workflowName = request.Name
            ?? uploadedFile?.FileName.LastRightPart('/').LastLeftPart('.')
            ?? $"Unknown ({workflowJson.Length})";

        workflowName = StringFormatters.FormatName(workflowName);
        var workflow = workflowJson.ParseAsObjectDictionary();
        var parsedWorkflow = appData.TryParseWorkflow(workflowJson, workflowName, "SDXL", "v1")
            ?? throw HttpError.BadRequest("Failed to parse workflow");
        return parsedWorkflow;
    }

    public async Task<object> Post(UploadNewWorkflow request)
    {
        using var db = Db;
        var now = DateTime.UtcNow;
        var userId = Request.GetRequiredUserId();
        
        if (Request.Files.Length == 0)
            throw HttpError.BadRequest("No file uploaded");

        var name = request.WorkflowName ?? Request.Files[0].FileName.LastRightPart('/').LastLeftPart('.');
        // Check for invalid filename chars
        if (name.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0 ||
            name.IndexOfAny(Path.GetInvalidPathChars()) >= 0)
            throw HttpError.BadRequest("Invalid Name");

        var versionName = "v1";
        if (name.IndexOf('.') >= 0)
        {
            versionName = name.LastRightPart('.');
            name = name.LastLeftPart('.');
        }
        
        if (db.Exists<Workflow>(x => x.Name == name))
            throw new ArgumentNullException(nameof(request.WorkflowName), $"Workflow '{name}' already exists");

        var workflowJson = await Request.Files[0].InputStream.ReadToEndAsync();

        var baseModel = request.BaseModel.ToJsv(); // Use EnumMember Value if exists
        var parsedWorkflow = appData.ParseWorkflow(workflowJson, name, baseModel, versionName);
        var saveToFullPath = appData.WorkflowsPath.CombineWith(parsedWorkflow.Path);
        Path.GetDirectoryName(saveToFullPath).AssertDir();
        await File.WriteAllTextAsync(saveToFullPath, workflowJson);

        var version = new WorkflowVersion
        {
            Name = parsedWorkflow.Name,
            Version = parsedWorkflow.Version,
            Path = parsedWorkflow.Path,
            Workflow = parsedWorkflow.Workflow,
            Info = parsedWorkflow.Info,
            Nodes = parsedWorkflow.Nodes,
            Assets = parsedWorkflow.Assets,
            CreatedBy = userId,
            CreatedDate = now,
            ModifiedBy = userId,
            ModifiedDate = now,
        };
        var clientId = parsedWorkflow.Workflow.TryGetValue("Id", out var oId) && oId is string id
            ? id
            : Guid.NewGuid().ToString("N");
        var (apiPrompt, _, promptJson) = await nodeConverter.CreateApiPromptAsync(version, new(), agent:null, clientId);
        parsedWorkflow.ApiPrompt = apiPrompt.Prompt; 
        
        var (workflow, workflowVersion) = AppData.CreateWorkflowAndVersion(Db, parsedWorkflow, userId);
        
        appData.AddWorkflowVersion(workflowVersion);

        return new UploadNewWorkflowResponse
        {
            VersionId = workflowVersion.Id,
            Nodes = parsedWorkflow.Nodes,
            Assets = parsedWorkflow.Assets,
            Info = parsedWorkflow.Info,
        };
        
    }
}

public class ExecuteComfyApiPrompt
{
    public string ClientId { get; set; }
    public string? UserId { get; set; }
    public ApiPrompt ApiPrompt { get; set; }
    public HashSet<string> RequiredNodes { get; set; }
    public HashSet<string> RequiredAssets { get; set; }
    public TimeSpan? Timeout { get; set; }
}

public class GetComfyResults
{
    public long MediaProviderId { get; set; }
    public string PromptId { get; set; }
    public string ClientId { get; set; }
    public TimeSpan? Timeout { get; set; }
}

