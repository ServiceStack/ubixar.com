using System.Collections.Concurrent;
using System.Data;
using Microsoft.Extensions.Logging;
using MyApp.ServiceInterface.Commands;
using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.Data;
using ServiceStack.Jobs;
using ServiceStack.OrmLite;

namespace MyApp.ServiceInterface;

public class AgentEventsManager(ILogger<AgentEventsManager> log, AppData appData, IBackgroundJobs jobs)
{
    private readonly ConcurrentDictionary<string, BlockingCollection<AgentEvent>> agentTaskQueues = new();
    
    public ConcurrentDictionary<string, WorkflowGeneration> QueuedGenerations = new();

    public List<ComfyAgent> GetComfyAgents(ComfyAgentQuery options = default)
    {
        if (options.DeviceId != null)
        {
            appData.ComfyAgents.TryGetValue(options.DeviceId, out var agent);
            return agent != null ? [agent] : [];
        }

        var candidates = new List<ComfyAgent>();
        if (options.UserId != null)
        {
            candidates.AddRange(appData.ComfyAgents.Values.Where(x => x.UserId == options.UserId));
        }

        if (candidates.Count == 0)
        {
            log.LogWarning("No ComfyAgents found for user {UserId}, total {Total} agents online", 
                options.UserId, appData.ComfyAgents.Count);
            candidates = appData.ComfyAgents.Values.ToList();
        }
        
        var ret = candidates
            .OrderBy(x => x.QueueCount)
            .ThenByDescending(x => x.LastUpdate)
            .ToList();

        if (options.LanguageModel != null)
        {
            var agentEventCounts = GetAgentEventsCount();
            return ret.Where(x => x.LanguageModels?.Contains(options.LanguageModel) == true)
                .OrderBy(x => agentEventCounts.GetValueOrDefault(x.DeviceId, 0))
                .ToList();
            
        }
        
        return ret;
    }
    
    IEnumerable<string> KeysWithoutLock()
    {
        foreach (var item in agentTaskQueues)
        {
            yield return item.Key;
        }
    }
    public List<string> GetConnectedDeviceIds() => KeysWithoutLock().ToList();

    public void QueueGeneration(WorkflowGeneration generation)
    {
        var exists = QueuedGenerations.ContainsKey(generation.Id);
        QueuedGenerations[generation.Id] = generation; // update with latest
        if (!exists)
        {
            SignalGenerationRequest();
        }
    }

    public long GenerationRequest = 0;
    public void SignalGenerationRequest() => Interlocked.Increment(ref GenerationRequest);

    public long GenerationUpdates = 0;
    public void SignalGenerationUpdated() => Interlocked.Increment(ref GenerationUpdates);

    public long AiTaskRequest = 0;
    public void SignalAiTaskRequest() => Interlocked.Increment(ref AiTaskRequest);


    public async Task<bool> WaitForUpdatedGenerationAsync(int timeoutMs)
    {
        var startedAt = DateTime.UtcNow;
        var originalGenerations = Interlocked.Read(ref GenerationUpdates);
        do
        {
            if (Interlocked.Read(ref GenerationUpdates) != originalGenerations)
                return true;
            await Task.Delay(100);
        } while ((DateTime.UtcNow - startedAt).TotalMilliseconds < timeoutMs);
        return false;
    }

    public long ClassificationRequest = 0;
    public void SignalClassificationRequest() => Interlocked.Increment(ref ClassificationRequest);
    public async Task<bool> WaitForUpdatedClassificationsAsync(TimeSpan timeout)
    {
        var startedAt = DateTime.UtcNow;
        var originalGenerations = Interlocked.Read(ref ClassificationRequest);
        do
        {
            if (Interlocked.Read(ref ClassificationRequest) != originalGenerations)
                return true;
            await Task.Delay(100);
        } while ((DateTime.UtcNow - startedAt) < timeout);
        return false;
    }

    public void Enqueue(string deviceId, AgentEvent msg)
    {
        if (string.IsNullOrEmpty(deviceId))
            throw new ArgumentNullException(nameof(deviceId));
        if (msg == null)
            throw new ArgumentNullException(nameof(msg));

        if (agentTaskQueues.TryGetValue(deviceId, out var queue))
        {
            queue.Add(msg);
        }
        else
        {
            throw HttpError.NotFound("Device is offline");
        }
    }

    public Dictionary<string, int> GetAgentEventsCount()
    {
        var to = new Dictionary<string, int>();
        foreach (var entry in agentTaskQueues)
        {
            to[entry.Key] = entry.Value.Count;
        }
        return to;
    }

    public List<AgentEvent> GetAllAgentEvents()
    {
        return agentTaskQueues
            .SelectMany(entry => entry.Value)
            .ToList();
    }
    
    public BlockingCollection<AgentEvent> GetAgentEvents(string deviceId)
    {
        if (string.IsNullOrEmpty(deviceId))
            throw new ArgumentNullException(nameof(deviceId));

        if (!agentTaskQueues.TryGetValue(deviceId, out var queue))
        {
            queue = new BlockingCollection<AgentEvent>();
            agentTaskQueues.TryAdd(deviceId, queue);
        }
 
        return queue;
    }
    
    public async Task<List<AgentEvent>> WaitForAgentEventsAsync(IDbConnection db, ComfyAgent agent, string userId, int timeoutMs, CancellationToken token=default)
    {
        var ret = new List<AgentEvent>();
        var startedAt = DateTime.UtcNow;
        var agentEvents = GetAgentEvents(agent.DeviceId);
        var originalGenerations = Interlocked.Read(ref GenerationRequest);
        do
        {
            // Check if a new generation was created for this device since we last checked
            if (Interlocked.Read(ref GenerationRequest) != originalGenerations)
            {
                var nextGenerations = appData.GetNextGenerations(db, agent, userId, take: 1);
                if (nextGenerations.Count > 0)
                {
                    log.LogInformation("WaitForAgentEventsAsync: {DeviceId} - {Count} new generations", agent.DeviceId, nextGenerations.Count);
                    return nextGenerations.Map(x => x.ToExecWorkflow());
                }
                originalGenerations = Interlocked.Read(ref GenerationRequest);
            }
            
            // Check if there are any pending events for this agent
            if (agentEvents.TryTake(out var msg))
            {
                ret.Add(msg);
                return ret;
            }
            await Task.Delay(100, token);
            if (token.IsCancellationRequested)
                break;
        } while ((DateTime.UtcNow - startedAt).TotalMilliseconds < timeoutMs);
        return ret;
    }
    
    public BackgroundJobRef EnqueueChatMessage(string prompt, string? systemPrompt=null,
        string? model = null, string? userId = null, string? callback = null, Dictionary<string,string>? args = null)
    {
        model ??= appData.Config.ChatLanguageModel;
        var taskId = PreciseTimestamp.UniqueUtcNowTicks;
        var refId = $"{taskId}";
        var replyTo = $"/api/{nameof(CompleteChatCompletion)}".AddQueryParam(nameof(refId), refId);
        var jobRef = jobs.EnqueueCommand<ChatCompletionCommand>(new ChatCompletion {
            Model = model,
            Messages = [
                new()
                {
                    Role = "system", 
                    Content = systemPrompt ?? "You are a helpful assistant.",
                },
                new()
                {
                    Role = "user", 
                    Content = prompt
                },
            ]
        }, new() {
            RefId = refId,
            ReplyTo = replyTo,
            Args = args,
            UserId = userId,
            Callback = callback,
        });
        return jobRef;
    }
    
    public BackgroundJobRef EnqueueArtifactChat(Artifact artifact, string prompt, string? callback = null, string? userId = null, string? model = null)
    {
        model ??= appData.Config.VisualLanguageModel;
        var taskId = PreciseTimestamp.UniqueUtcNowTicks;
        var refId = $"{taskId}";
        var replyTo = $"/api/{nameof(CompleteChatCompletion)}".AddQueryParam(nameof(refId), refId);
        var jobRef = jobs.EnqueueCommand<ChatCompletionCommand>(new ChatCompletion {
            Model = model,
            Messages = [
                new()
                {
                    Role = "user", 
                    Content = new List<Dictionary<string, object>>
                    {
                        new () {
                            ["type"] = "image_url", 
                            ["image_url"] = new Dictionary<string, object> {
                                ["url"] = artifact.Url,
                            },
                        },
                        new() {
                            ["type"] = "text", 
                            ["text"] = prompt,
                        },
                    }
                },
            ]
        }, new() {
            RefId = refId,
            ReplyTo = replyTo,
            Callback = callback,
            UserId = userId,
            Args = new() {
                ["artifactId"] = $"{artifact.Id}",
            },
        });
        return jobRef;
    }

    public void Reload(IDbConnection db)
    {
        QueuedGenerations.Clear();
        var queuedGenerations = db.Select(db.From<WorkflowGeneration>()
            .Where(x => x.Result == null && x.Error == null && x.DeletedDate == null));
        foreach (var generation in queuedGenerations)
        {
            QueuedGenerations[generation.Id] = generation;
        }
        log.LogInformation("Reloaded {Count} pending generations", QueuedGenerations.Count);
    }

    public void RemoveAgent(string deviceId)
    {
        agentTaskQueues.TryRemove(deviceId, out _);
    }
    
    public WorkflowGeneration[] GetNextGenerations(IDbConnection db, ComfyAgent agent, string userId, int take)
    {
        var queuedGenerations = this.QueuedGenerations.ValuesWithoutLock().ToList();

        bool AssignedToAgent(string generationId)
        {
            var updated = db.UpdateOnly(() => new WorkflowGeneration
            {
                DeviceId = agent.DeviceId,
                ModifiedBy = userId,
                ModifiedDate = DateTime.UtcNow,
                StatusUpdate = GenerationStatus.AssignedToAgent,
            }, where: x => x.Id == generationId 
                && (x.DeviceId == null || x.DeviceId == agent.DeviceId)
                && x.Result == null && x.Error == null && x.DeletedDate == null);

            // Whether it's been already assigned, or we've just assigned it now, remove it from the queue
            QueuedGenerations.Remove(generationId, out _);
            queuedGenerations.RemoveAll(x => x.Id == generationId);

            return updated != 0;
        }

        var incompatibleIds = new HashSet<string>();
        bool CanRunWorkflow(WorkflowGeneration gen)
        {
            if (incompatibleIds.Contains(gen.Id))
                return false;
            if (!appData.AgentCanRunWorkflow(agent, gen))
            {
                incompatibleIds.Add(gen.Id);
                return false;
            }
            return true;
        }
        
        var missingAssignedGenerationsCount = 0;
        var pendingUserOrDeviceGenerationsCount = 0;
        var pendingForAnyDeviceCount = 0;
        var unassignedPendingGenerationsCount = 0;
        var reassignedForInactiveAgentsCount = 0;
        var ret = new List<WorkflowGeneration>();
        
        // Check for any missing assigned generations for this device
        // Generations can be lost when agents restart, resend any assigned generations that is not in their queue 
        var missingAssignedGenerations = appData.SortGenerationQueue(db, queuedGenerations
            .Where(x => x.Result == null && x.Error == null && x.DeletedDate == null 
                && x.DeviceId == agent.DeviceId && !agent.QueuedIds.Contains(x.Id)));
        foreach (var missingAssignedGeneration in missingAssignedGenerations)
        {
            // Skip if we've already added this generation
            if (ret.Any(x => x.Id == missingAssignedGeneration.Id))
                continue;
            // Skip if we can't assign this generation to this agent
            if (!AssignedToAgent(missingAssignedGeneration.Id)) 
                continue;

            ret.Add(missingAssignedGeneration);
            missingAssignedGenerationsCount++;
            if (ret.Count >= take)
                break;
        }
            
        if (queuedGenerations.Count > 0 && ret.Count <= take)
        {
            // Check for any pending generations for this device or user
            var pendingUserOrDeviceGenerations = appData.SortGenerationQueue(db, queuedGenerations
                .Where(x => x.Result == null && x.Error == null && x.DeletedDate == null && x.PromptId == null
                    && (x.DeviceId == agent.DeviceId || x.UserId == userId)));
            foreach (var pendingGeneration in pendingUserOrDeviceGenerations)
            {
                // Skip if we've already added this generation
                if (ret.Any(x => x.Id == pendingGeneration.Id))
                    continue;
                // Skip if this agent can't run this workflow
                if (!CanRunWorkflow(pendingGeneration)) 
                    continue;
                // Skip if we can't assign this generation to this agent
                if (!AssignedToAgent(pendingGeneration.Id)) 
                    continue;

                ret.Add(pendingGeneration);
                pendingUserOrDeviceGenerationsCount++;
                if (ret.Count >= take)
                    break;
            }
        }

        if (queuedGenerations.Count > 0 && ret.Count <= take)
        {
            // Check for any pending generations for any device
            var pendingForAnyDevice = appData.SortGenerationQueue(db, queuedGenerations
                .Where(x => x.Result == null && x.Error == null && x.DeletedDate == null 
                    && x.PromptId == null && x.DeviceId == null));
            foreach (var pendingGeneration in pendingForAnyDevice)
            {
                // Skip if we've already added this generation
                if (ret.Any(x => x.Id == pendingGeneration.Id))
                    continue;
                // Skip if this agent can't run this workflow
                if (!CanRunWorkflow(pendingGeneration))
                    continue;
                // Skip if we can't assign this generation to this agent
                if (!AssignedToAgent(pendingGeneration.Id)) 
                    continue;

                ret.Add(pendingGeneration);
                pendingForAnyDeviceCount++;
                if (ret.Count >= take)
                    break;
            }
        }

        int updated = 0;
        if (queuedGenerations.Count > 0 && ret.Count <= take)
        {
            // Check for any pending generations for unassigned device
            var unassignedPendingGenerations = appData.SortGenerationQueue(db, queuedGenerations
                .Where(x => x.Result == null && x.Error == null && x.DeletedDate == null && x.DeviceId == null));
            foreach (var queuedGeneration in unassignedPendingGenerations)
            {
                // Skip if we've already added this generation
                if (ret.Any(x => x.Id == queuedGeneration.Id))
                    continue;
                // Skip if this agent can't run this workflow
                if (!CanRunWorkflow(queuedGeneration))
                    continue;
                // Skip if we can't assign this generation to this agent
                if (!AssignedToAgent(queuedGeneration.Id)) 
                    continue;

                ret.Add(queuedGeneration);
                unassignedPendingGenerationsCount++;
                if (ret.Count >= take)
                    break;
            }
        }

        if (queuedGenerations.Count > 0 && ret.Count <= take)
        {
            // Reassign any pending generations to inactive agents
            var activeDeviceIds = appData.GetActiveComfyAgentDeviceIds();
            var reassignedForInactiveAgents = appData.SortGenerationQueue(db, queuedGenerations
                .Where(x => x.Result == null && x.Error == null && x.DeletedDate == null 
                    && x.CreatedDate < DateTime.UtcNow.AddMinutes(-5) && !activeDeviceIds.Contains(x.DeviceId)));
            foreach (var queuedGeneration in reassignedForInactiveAgents)
            {
                // Skip if we've already added this generation
                if (ret.Any(x => x.Id == queuedGeneration.Id))
                    continue;
                // Skip if this agent can't run this workflow
                if (!CanRunWorkflow(queuedGeneration))
                    continue;
                // Skip if we can't assign this generation to this agent
                if (!AssignedToAgent(queuedGeneration.Id)) 
                    continue;

                ret.Add(queuedGeneration);
                reassignedForInactiveAgentsCount++;
                if (ret.Count >= take)
                    break;
            }
        }
        
        if (ret.Count > take)
            ret = ret.Take(take).ToList();

        if (ret.Count > 0)
        {
            log.LogInformation("Agent {DeviceId} ({AgentIp}) has been assigned {Count} new generations: " +
                               "{MissingAssignedDeviceGenerationsCount} missing assigned, " +
                               "{PendingUserOrDeviceGenerationsCount} pending user or device, " +
                               "{PendingForAnyDeviceCount} pending for any device, " +
                               "{UnassignedPendingGenerationsCount} unassigned, " +
                               "{ReassignedForInactiveAgentsCount} reassigned for inactive agents.", 
                agent.DeviceId, agent.LastIp, ret.Count, missingAssignedGenerationsCount, 
                pendingUserOrDeviceGenerationsCount, pendingForAnyDeviceCount, 
                unassignedPendingGenerationsCount, reassignedForInactiveAgentsCount);
        }
        else
        {
            log.LogInformation("Agent {DeviceId} ({AgentIp}) has not been assigned any new generations.", 
                agent.DeviceId, agent.LastIp);
        }
        
        return ret.ToArray();
    }

    public PendingArtifactResults GetPendingArtifactTasks(IDbConnection db, string userId, List<int>? artifactIds=null, int? take=null)
    {
        var toCaption = new List<Artifact>();
        var toDescribe = new List<Artifact>();
        
        var nextArtifacts = db.Select(db.From<Artifact>()
            .Where(x => x.Type == AssetType.Image 
                && (x.Caption == null || x.Description == null) 
                && (artifactIds == null || artifactIds.Contains(x.Id))
                && x.PublishedDate != null
                && x.DeletedDate == null)
                .OrderBy(x => x.Id)
                .Take(take)
            );

        if (nextArtifacts.Count == 0) 
            return new ([], [], [], [], []);
        
        var backgroundJobs = db.Select(db.From<BackgroundJob>()
            .Where(x => x.Callback == nameof(CaptionArtifactCommand) || x.Callback == nameof(DescribeArtifactCommand)));
        
        var existingCaptionArtifactIds = backgroundJobs.Where(x => x.Callback == nameof(CaptionArtifactCommand))
            .Select(x => int.Parse(x.Args?.GetValueOrDefault("artifactId") ?? "-1"))
            .ToList();
        var existingDescribeArtifactIds = backgroundJobs.Where(x => x.Callback == nameof(DescribeArtifactCommand))
            .Select(x => int.Parse(x.Args?.GetValueOrDefault("artifactId") ?? "-1"))
            .ToList();

        log.LogInformation("RequeueCaptionTasks: {ArtifactsCount} artifacts: {ArtifactIds}\n{CaptionsCount} captions: {ExistingCaptionArtifactIds}\n{DescriptionsCount} descriptions: {ExistingDescribeArtifactIds}", 
            nextArtifacts.Count,
            nextArtifacts.Select(x => x.Id).Join(", "), 
            existingCaptionArtifactIds.Count,
            existingCaptionArtifactIds.Join(", "),
            existingDescribeArtifactIds.Count,
            existingDescribeArtifactIds.Join(", "));
        
        foreach (var artifact in nextArtifacts)
        {
            if (artifact.Caption == null)
            {
                if (!existingCaptionArtifactIds.Contains(artifact.Id))
                {
                    toCaption.Add(artifact);
                }
            }

            if (artifact.Description == null)
            {
                if (!existingDescribeArtifactIds.Contains(artifact.Id))
                {
                    toDescribe.Add(artifact);
                }
            }
        }
        
        return new(nextArtifacts, existingCaptionArtifactIds, existingDescribeArtifactIds, toCaption, toDescribe);
    }

    public List<string> RequeueCaptionTasks(IDbConnection db, string userId, List<int>? artifactIds=null, int? take=null)
    {
        take ??= 1;
        var results = new List<string>();
        var pendingTasks = GetPendingArtifactTasks(db, userId, artifactIds, take);

        foreach (var artifact in pendingTasks.CaptionArtifacts)
        {
            var jobRef = EnqueueArtifactChat(artifact, CaptionArtifactCommand.Prompt,  callback:nameof(CaptionArtifactCommand),  userId:userId);
            results.Add($"Requeue Caption Artifact: {jobRef.Id}/{jobRef.RefId}");
        }

        foreach (var artifact in pendingTasks.DescribeArtifacts)
        {
            var jobRef = EnqueueArtifactChat(artifact, DescribeArtifactCommand.Prompt, callback:nameof(DescribeArtifactCommand), userId:userId);
            results.Add($"Requeue Describe Artifact: {jobRef.Id}/{jobRef.RefId}");
        }

        return results;
    }

    public void RemoveGeneration(string generationId)
    {
        QueuedGenerations.Remove(generationId, out _);
    }
}

public record PendingArtifactResults(
    List<Artifact> PendingArtifacts, 
    List<int> ExistingCaptionArtifactIds, 
    List<int> ExistingDescribeArtifactIds, 
    List<Artifact> CaptionArtifacts, 
    List<Artifact> DescribeArtifacts);

// https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
public class ServerEvent
{
    /// <summary>
    /// The event ID to set the EventSource object's last event ID value.
    /// </summary>
    public int? Id { get; set; }
    
    /// <summary>
    /// A string identifying the type of event described. If this is specified, an event will be dispatched
    /// on the browser to the listener for the specified event name;
    /// the website source code should use addEventListener() to listen for named events.
    /// The onmessage handler is called if no event name is specified for a message.
    /// </summary>
    public string? Event { get; set; }
    
    /// <summary>
    /// The data field for the message.
    /// When the EventSource receives multiple consecutive lines that begin with data:, it concatenates them,
    /// inserting a newline character between each one. Trailing newlines are removed.
    /// </summary>
    public object? Data { get; set; }
    
    /// <summary>
    /// The reconnection time. If the connection to the server is lost,
    /// the browser will wait for the specified time before attempting to reconnect.
    /// This must be an integer, specifying the reconnection time in milliseconds.
    /// If a non-integer value is specified, the field is ignored.
    /// </summary>
    public int? Retry { get; set; }
}
