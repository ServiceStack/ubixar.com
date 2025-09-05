using Microsoft.Extensions.Logging;
using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.OrmLite;

namespace MyApp.ServiceInterface;

public class DeviceServices(ILogger<DeviceServices> log, AppData appData, AgentEventsManager agentEvents) 
    : Service
{
    public object Any(FindAssets request)
    {
        var ret = new FindAssetsResponse();

        var fileNames = request.Assets.Map(x => x.LastRightPart('/'));
        var assets = Db.Select<Asset>(x => fileNames.Contains(x.FileName));

        foreach (var modelPath in request.Assets.Safe())
        {
            var fileName = modelPath.LastRightPart('/');
            var assetUrl = assets.FirstOrDefault(x => x.FileName == fileName)?.Url;
            if (assetUrl == null)
            {
                var q = Db.From<WorkflowVersion>();
                q.Where(q.Column<WorkflowVersion>(x => x.Info) + " LIKE {0}", 
                    $"%{fileName}%");
                var workflowVersion = Db.Single(q);
                var asset = workflowVersion?.Info?.Assets.FirstOrDefault(x => x.Asset.EndsWith(fileName));
                if (asset?.Url != null)
                    assetUrl = asset.Url;
            }
            
            if (assetUrl != null)
            {
                ret.Results[modelPath] = assetUrl;
            }
        }
        
        return ret;
    }
    
    public object Any(FindCustomNodes request)
    {
        var ret = new FindCustomNodesResponse();

        foreach (var nodeType in request.Types.Safe())
        {
            if (appData.NodesUrlMap.TryGetValue(nodeType, out var nodeUrl))
            {
                ret.Results[nodeType] = nodeUrl;
            }
        }
        
        return ret;
    }
    
    private ComfyAgent GetRequiredAgent(string deviceId)
    {
        var agent = appData.GetComfyAgent(new(DeviceId:deviceId))
            ?? Db.Single<ComfyAgent>(x => x.DeviceId == deviceId)
            ?? throw HttpError.NotFound("Device not found");

        var userId = Request.GetRequiredUserId();
        if (agent.UserId != userId && !Request.GetClaimsPrincipal().IsAdmin())
            throw HttpError.Forbidden("Device does not belong to you");
        
        return agent;
    }

    private ComfyAgent GetRequiredAgentById(int agentId)
    {
        var agent = appData.ComfyAgents.Values.FirstOrDefault(x => x.Id == agentId)
            ?? Db.Single<ComfyAgent>(x => x.Id == agentId)
            ?? throw HttpError.NotFound("Device not found");
        
        return agent;
    }

    private static char[] InvalidChars = ['\'', '"', '`', '$', '[', ']', ';', '|', '*', '\\', '\t', '\n', '\r'];
    
    public object Post(InstallPipPackage request)
    {
        if (request.Package.IndexOfAny(InvalidChars) >= 0)
            throw HttpError.BadRequest("Invalid Package Name");
        
        if (request.Package.Contains("://") && !Uri.TryCreate(request.Package, UriKind.Absolute, out var url))
            throw HttpError.BadRequest("Invalid URL");
        
        var agent = GetRequiredAgent(request.DeviceId);
        agent.RequirePip ??= [];
        if (!agent.RequirePip.Contains(request.Package))
        {
            if (request.Require == true)
                agent.RequirePip.AddIfNotExists(request.Package);
            
            agent.Status = $"Queued pip install {request.Package}...";
            agent.SetLastUpdate();

            Db.UpdateOnly(() => new ComfyAgent {
                RequirePip = agent.RequirePip,
                Status = agent.Status,
                ModifiedDate = agent.ModifiedDate,
            }, where: x => x.DeviceId == agent.DeviceId);
        }
        
        agentEvents.Enqueue(request.DeviceId, new AgentEvent
        {
            Name = EventMessages.InstallPipPackage,
            Args = new() {
                ["package"] = request.Package,
            }
        });
        return new StringResponse
        {
            Result = agent.Status
        };
    }

    public object Post(UninstallPipPackage request)
    {
        var agent = GetRequiredAgent(request.DeviceId);
        agent.Status = $"Queued pip uninstall {request.Package}...";
        agent.SetLastUpdate();
        
        agent.RequirePip?.RemoveAll(x => x == request.Package);

        Db.UpdateOnly(() => new ComfyAgent {
            Status = agent.Status,
            RequirePip = agent.RequirePip,
            ModifiedDate = agent.ModifiedDate,
        }, where: x => x.DeviceId == agent.DeviceId);

        agentEvents.Enqueue(request.DeviceId, new AgentEvent
        {
            Name = EventMessages.UninstallPipPackage,
            Args = new() {
                ["package"] = request.Package,
            }
        });
        return new StringResponse
        {
            Result = agent.Status
        };
    }

    public object Post(InstallCustomNode request)
    {
        var agent = GetRequiredAgent(request.DeviceId);
        agent.RequireNodes ??= new();
        if (!agent.RequireNodes.Contains(request.Url))
        {
            if (request.Require == true)
                agent.RequirePip.AddIfNotExists(request.Url);

            agent.Status = $"Queued install {request.Url.RightPart('@').LastLeftPart('?')}...";
            agent.SetLastUpdate();

            Db.UpdateOnly(() => new ComfyAgent {
                RequireNodes = agent.RequireNodes,
                Status = agent.Status,
                ModifiedDate = agent.ModifiedDate,
            }, where: x => x.DeviceId == agent.DeviceId);
        }
        
        agentEvents.Enqueue(request.DeviceId, new AgentEvent
        {
            Name = EventMessages.InstallCustomNode,
            Args = new() {
                ["url"] = request.Url,
            }
        });
        return new StringResponse
        {
            Result = $"Enqueued {request.Url} for {request.DeviceId}"
        };
    }

    public object Post(UninstallCustomNode request)
    {
        var agent = GetRequiredAgent(request.DeviceId);
        agent.Status = $"Queued uninstall of {request.Url.LastRightPart('/')}...";
        agent.SetLastUpdate();
        
        agent.RequireNodes?.RemoveAll(x => x == request.Url);

        Db.UpdateOnly(() => new ComfyAgent {
            Status = agent.Status,
            RequireNodes = agent.RequireNodes,
            ModifiedDate = agent.ModifiedDate,
        }, where: x => x.DeviceId == agent.DeviceId);

        agentEvents.Enqueue(request.DeviceId, new AgentEvent
        {
            Name = EventMessages.UninstallCustomNode,
            Args = new() {
                ["url"] = request.Url,
            }
        });
        return new StringResponse
        {
            Result = agent.Status
        };
    }

    public object Post(InstallAsset request)
    {
        var asset = Db.SingleById<Asset>(request.AssetId)
            ?? throw HttpError.NotFound("Asset not found");

        return Post(new InstallModel {
            DeviceId = request.DeviceId,
            Url = asset.Url,
            SaveTo = asset.SavePath,
            FileName = asset.FileName,
            Token = asset.Token,
            Require = request.Require,
        });
    }

    public object Post(InstallModel request)
    {
        var agent = GetRequiredAgent(request.DeviceId);
        agent.RequireModels ??= [];
        var saveTo = request.SaveTo.Trim().CombineWith(request.FileName.Trim());
        var url = (!string.IsNullOrEmpty(request.Token) ? request.Token + "@" : "") + request.Url.Trim();
        var model = $"{saveTo} {url}";
        
        agent.Status = $"Queued download of {request.FileName} to {request.SaveTo}";

        if (!agent.RequireModels.Contains(model))
        {
            agent.RequireModels.AddIfNotExists(model);
            agent.SetLastUpdate();
            
            Db.UpdateOnly(() => new ComfyAgent {
                RequireModels = agent.RequireModels,
                Status = agent.Status,
                ModifiedDate = agent.ModifiedDate,
            }, where: x => x.DeviceId == agent.DeviceId);
        }

        agentEvents.Enqueue(request.DeviceId, new AgentEvent
        {
            Name = EventMessages.DownloadModel,
            Args = new() {
                ["model"] = model,
            }
        });
        
        return new StringResponse
        {
            Result = agent.Status
        };
    }

    public object Post(DeleteModel request)
    {
        var agent = GetRequiredAgent(request.DeviceId);
        var fileName = request.Path.LastRightPart('/');
        agent.Status = $"Queued delete model {fileName}...";
        agent.SetLastUpdate();

        agent.RequireModels?.RemoveAll(x => x.StartsWith(request.Path));
        
        Db.UpdateOnly(() => new ComfyAgent {
            Status = agent.Status,
            RequireModels = agent.RequireModels,
            ModifiedDate = agent.ModifiedDate,
        }, where: x => x.DeviceId == agent.DeviceId);

        agentEvents.Enqueue(request.DeviceId, new AgentEvent
        {
            Name = EventMessages.DeleteModel,
            Args = new() {
                ["path"] = request.Path,
            }
        });
        return new StringResponse
        {
            Result = agent.Status
        };
    }

    public object Post(RebootAgent request)
    {
        var agent = GetRequiredAgent(request.DeviceId);
        agentEvents.Enqueue(request.DeviceId, new AgentEvent {
            Name = EventMessages.Reboot,
        });
        
        agent.Status = "Reboot queued...";
        agent.SetLastUpdate();
            
        Db.UpdateOnly(() => new ComfyAgent {
            Status = agent.Status,
            ModifiedDate = agent.ModifiedDate,
        }, where: x => x.DeviceId == agent.DeviceId);
        
        return new StringResponse
        {
            Result = agent.Status
        };
    }

    public object Post(AgentCommand request)
    {
        var agent = GetRequiredAgent(request.DeviceId);
        var eventName = request.Command switch
        {
            AgentCommands.Refresh => EventMessages.Refresh,
            AgentCommands.Reboot => EventMessages.Reboot,
            AgentCommands.Register => EventMessages.Register,
            _ => throw new ArgumentOutOfRangeException(nameof(request.Command), request.Command, null)
        };
        agentEvents.Enqueue(request.DeviceId, new AgentEvent {
            Name = eventName,
        });
        
        agent.Status = $"{eventName} queued...";
        agent.SetLastUpdate();
            
        Db.UpdateOnly(() => new ComfyAgent {
            Status = agent.Status,
            ModifiedDate = agent.ModifiedDate,
        }, where: x => x.DeviceId == agent.DeviceId);
        
        return new StringResponse
        {
            Result = agent.Status
        };
    }

    public async Task<object> Get(GetDeviceStatus request)
    {
        var agent = GetRequiredAgent(request.DeviceId);
        var startedAt = DateTime.UtcNow;
        var updateCounter = agent.Updates;
        
        if (request.Poll == true)
        {
            var waitFor = TimeSpan.FromSeconds(60);
            do
            {
                await Task.Delay(200);
            } while (updateCounter == agent.Updates 
                && (request.StatusChanged == null || agent.Status == request.StatusChanged)
                && (DateTime.UtcNow - startedAt) < waitFor);
        }
        
        return agent.ConvertTo<GetDeviceStatusResponse>();
    }

    public async Task<object> Get(GetDeviceObjectInfo request)
    {
        var agent = GetRequiredAgent(request.DeviceId);
        var objectInfoPath = appData.GetDeviceObjectInfoPath(agent.DeviceId);
        if (objectInfoPath == null)
            throw HttpError.NotFound("Object Info not found");
        var objectInfoJson = await File.ReadAllTextAsync(objectInfoPath);
        return objectInfoJson;
    }

    public async Task<object> Get(GetDeviceStats request)
    {
        var agent = GetRequiredAgentById(request.Id);
                
        var q = Db.From<WorkflowGeneration>()
            .Join<WorkflowVersion>((wg,wv) => wg.VersionId == wv.Id)
            .Where(x => x.Result != null && x.DeviceId == agent.DeviceId)
            .GroupBy<WorkflowVersion>(wv => new { wv.Name })
            .OrderByDescending(wg => Sql.Sum(wg.Credits))
            .Select<WorkflowGeneration,WorkflowVersion>((wg,wv) => new {
                wv.Name,
                Count = Sql.Count("*"),
                Credits = Sql.Sum(wg.Credits),
            });

        var results = await Db.SqlListAsync<StatTotal>(q);
        return new QueryResponse<StatTotal>
        {
            Results = results,
        };
        
    }
}
