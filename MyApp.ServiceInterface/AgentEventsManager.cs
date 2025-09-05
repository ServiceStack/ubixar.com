using System.Collections.Concurrent;
using System.Data;
using Microsoft.Extensions.Logging;
using MyApp.ServiceInterface.Commands;
using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.Data;
using ServiceStack.OrmLite;

namespace MyApp.ServiceInterface;

public class AgentEventsManager(ILogger<AgentEventsManager> log, AppData appData)
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

    public void QueueAiTask(IAiTask task)
    {
        AiTasks[task.Id] = task;
        SignalAiTaskRequest();
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
    
    public ConcurrentDictionary<long, IAiTask> AiTasks = new();

    public OllamaGenerateTask AddCaptionArtifactTask(IDbConnection dbTasks, Artifact artifact, string userId, string? model=null)
    {
        model ??= appData.Config.VisualLanguageModel;
        var artifactPath = appData.GetArtifactPath(artifact.Url.LastRightPart('/'));
        var task = AddOllamaGenerateTask(dbTasks, new OllamaGenerateTask {
            Model = model,
            Task = ServiceModel.AiTasks.CaptionImage,
            TaskId = $"{artifact.Id}",
            Request = new() {
                Model = model,
                Prompt = "A caption of this image: ",
                Images = [artifactPath], // Needs to be converted to base64 before execution
                Stream = false,
            },
            Callback = nameof(CaptionImageCommand),
        }.WithAudit(userId, DateTime.UtcNow));
        return task;
    }

    public OllamaGenerateTask AddDescribeArtifactTask(IDbConnection dbTasks, Artifact artifact, string userId, string? model=null)
    {
        model ??= appData.Config.VisualLanguageModel;
        var artifactPath = appData.GetArtifactPath(artifact.Url.LastRightPart('/'));
        var task = AddOllamaGenerateTask(dbTasks, new OllamaGenerateTask {
            Model = model,
            Task = ServiceModel.AiTasks.DescribeImage,
            TaskId = $"{artifact.Id}",
            Request = new() {
                Model = model,
                Prompt = "A detailed description of this image: ",
                Images = [artifactPath], // Needs to be converted to base64 before execution
                Stream = false,
            },
            Callback = nameof(DescribeImageCommand),
        }.WithAudit(userId, DateTime.UtcNow));
        return task;
    }

    public OllamaGenerateTask AddOllamaGenerateTask(IDbConnection db, OllamaGenerateTask task)
    {
        task.Id = PreciseTimestamp.UniqueUtcNowTicks;
        task.RefId ??= Guid.NewGuid().ToString("N");
        task.ReplyTo = $"/api/{nameof(CompleteOllamaGenerateTask)}".AddQueryParam("taskId", task.Id);
        db.Insert(task);
        QueueAiTask(task);
        return task;
    }

    public OpenAiChatTask AddOpenAiPromptTask(IDbConnection dbTasks, string userId, string prompt, string? systemPrompt=null, string? model=null)
    {
        model ??= appData.Config.ChatLanguageModel;
        List<OpenAiMessage> messages = [];
        if (!string.IsNullOrEmpty(systemPrompt))
            messages.Add(new() { Role = "system", Content = systemPrompt });
        messages.Add(new() { Role = "user", Content = prompt });
        var task = AddOpenAiChatTask(dbTasks, new OpenAiChatTask {
            Model = model,
            Task = ServiceModel.AiTasks.OpenAiChat,
            Request = new() {
                Model = model,
                Messages = messages,
                Stream = false,
            },
        }.WithAudit(userId, DateTime.UtcNow));
        return task;
    }

    public OpenAiChatTask AddOpenAiChatTask(IDbConnection db, OpenAiChatTask task)
    {
        task.Id = PreciseTimestamp.UniqueUtcNowTicks;
        task.RefId ??= Guid.NewGuid().ToString("N");
        task.ReplyTo = $"/api/{nameof(CompleteOpenAiChatTask)}".AddQueryParam("taskId", task.Id);
        db.Insert(task);
        QueueAiTask(task);
        return task;
    }

    public AgentEvent[] GetNextAiTasks(ComfyAgent agent, string userId, int take)
    {
        var pendingTasks = AiTasks.ValuesWithoutLock()
            .Where(x => (x.DeviceId == null || x.DeviceId == agent.DeviceId)
                        && agent.LanguageModels?.Contains(x.Model) == true)
            .OrderBy(x => x.Id)
            .ToList();

        var ret = new List<AgentEvent>();
        if (agent.LanguageModels?.Count > 0 && !AiTasks.IsEmpty)
        {
            using var dbTasks = appData.OpenAiTaskDb();
            
            foreach (var task in pendingTasks)
            {
                if (task is OllamaGenerateTask)
                {
                    var assignTask = dbTasks.UpdateOnly(() => new OllamaGenerateTask
                    {
                        State = TaskState.Assigned,
                        Status = GenerationStatus.AssignedToAgent,
                        DeviceId = agent.DeviceId,
                        UserId = userId,
                    }, x => x.Id == task.Id && x.State == TaskState.Queued
                        && (x.DeviceId == null || x.DeviceId == agent.DeviceId));

                    if (assignTask == 0)
                    {
                        if (!dbTasks.Exists<OllamaGenerateTask>(x => x.Id == task.Id && x.State == TaskState.Queued))
                        {
                            log.LogWarning("Task {Id} was no longer queued, removing from queue", task.Id);
                            AiTasks.TryRemove(task.Id, out _);
                        }
                        continue;
                    }
                    
                    ret.Add(new AgentEvent
                    {
                        Name = EventMessages.ExecOllama,
                        Args = new() {
                            ["model"] = task.Model,
                            ["endpoint"] = "/api/generate",
                            ["request"] = $"/api/{nameof(GetOllamaGenerateTask)}".AddQueryParam("taskId", task.Id),
                            ["replyTo"] = task.ReplyTo,
                        }
                    });
                }
                else if (task is OpenAiChatTask)
                {
                    var assignTask = dbTasks.UpdateOnly(() => new OpenAiChatTask
                    {
                        State = TaskState.Assigned,
                        Status = GenerationStatus.AssignedToAgent,
                        DeviceId = agent.DeviceId,
                        UserId = userId,
                    }, x => x.Id == task.Id && x.State == TaskState.Queued
                        && (x.DeviceId == null || x.DeviceId == agent.DeviceId));

                    if (assignTask == 0)
                    {
                        if (!dbTasks.Exists<OpenAiChatTask>(x => x.Id == task.Id && x.State == TaskState.Queued))
                        {
                            log.LogWarning("Task {Id} was no longer queued, removing from queue", task.Id);
                            AiTasks.TryRemove(task.Id, out _);
                        }
                        continue;
                    }
                    
                    ret.Add(new AgentEvent
                    {
                        Name = EventMessages.ExecOllama,
                        Args = new() {
                            ["model"] = task.Model,
                            ["endpoint"] = "/v1/chat/completions",
                            ["request"] = $"/api/{nameof(GetOpenAiChatTask)}".AddQueryParam("taskId", task.Id),
                            ["replyTo"] = task.ReplyTo,
                        }
                    });
                }
                
                if (ret.Count >= take)
                    break;
            }
        }
        
        return ret.ToArray();
    }

    private static List<OllamaGenerateTask> GetPendingOllamaGenerateTasks(IDbConnection dbTasks, ComfyAgent agent)
    {
        var pendingTasks = dbTasks.Select(dbTasks.From<OllamaGenerateTask>()
            .Where(x => x.State == TaskState.Queued
                        && (x.DeviceId == null || x.DeviceId == agent.DeviceId)
                        && agent.LanguageModels.Contains(x.Model))
            .OrderBy(x => x.Id));
        return pendingTasks;
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
        
        AiTasks.Clear();
        using var dbTasks = appData.OpenAiTaskDb();
        var pendingOllamaGenerateTasks = dbTasks
            .Select(dbTasks.From<OllamaGenerateTask>()
            .Where(x => x.State == TaskState.Queued));
        foreach (var task in pendingOllamaGenerateTasks)
        {
            AiTasks[task.Id] = task;
        }
        
        var pendingOpenAiChatTasks = dbTasks
            .Select(dbTasks.From<OpenAiChatTask>()
                .Where(x => x.State == TaskState.Queued));
        foreach (var task in pendingOpenAiChatTasks)
        {
            AiTasks[task.Id] = task;
        }
        
        log.LogInformation("Reloaded {Count} pending tasks (generate {OllamaGenerateTasks}, chat {OpenAiChatTasks})", 
            AiTasks.Count, pendingOllamaGenerateTasks.Count, pendingOpenAiChatTasks.Count);
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

    public List<string> RequeueCaptionTasks(IDbConnection db,
        string userId, List<int>? artifactIds=null, int? take=null, string? model=null)
    {
        take ??= 1;
        model ??= appData.Config.VisualLanguageModel;
        
        using var dbTasks = appData.OpenAiTaskDb();

        var results = new List<string>();
        var nextArtifacts = db.Select(db.From<Artifact>()
            .Where(x => x.Type == AssetType.Image 
                && x.Caption == null || x.Description == null 
                && (artifactIds == null || artifactIds.Contains(x.Id))
                && x.DeletedDate == null)
                .OrderBy(x => x.Id)
                .Take(take)
            );

        if (nextArtifacts.Count == 0) 
            return results;
        
        var existingCaptionArtifactIds = dbTasks.ColumnDistinct<long>(dbTasks.From<OllamaGenerateTask>()
            .Where(x => x.Task == ServiceModel.AiTasks.CaptionImage)
            .Select(x => x.TaskId));
        var existingDescribeArtifactIds = dbTasks.ColumnDistinct<long>(dbTasks.From<OllamaGenerateTask>()
            .Where(x => x.Task == ServiceModel.AiTasks.DescribeImage)
            .Select(x => x.TaskId));
        var resetTaskIds = new HashSet<string>();
            
        foreach (var artifact in nextArtifacts)
        {
            if (artifact.Caption == null)
            {
                if (!existingCaptionArtifactIds.Contains(artifact.Id))
                {
                    var task = AddCaptionArtifactTask(dbTasks, artifact, userId, model);
                    results.Add($"{task.Task} {task.TaskId}");
                }
                else
                {
                    resetTaskIds.Add($"{artifact.Id}");
                }
            }

            if (artifact.Description == null)
            {
                if (!existingDescribeArtifactIds.Contains(artifact.Id))
                {
                    var task = AddDescribeArtifactTask(dbTasks, artifact, userId, model);
                    results.Add($"{task.Task} {task.TaskId}");
                }
                else
                {
                    resetTaskIds.Add($"{artifact.Id}");
                }
            }
        }

        if (resetTaskIds.Count > 0)
        {
            var updated = dbTasks.UpdateOnly(() => new OllamaGenerateTask
            {
                State = TaskState.Queued,
                DeviceId = null,
                UserId = null,
                Error = null,
            }, where: x => resetTaskIds.Contains(x.TaskId!) && x.Result == null);
            results.Add($"Reset {updated} tasks");
        }

        // Re-add any incomplete tasks to the queue
        var incompleteTasks = dbTasks.Select(dbTasks.From<OllamaGenerateTask>()
            .Where(x => x.Result == null && x.Error == null && x.DeletedDate == null));
        foreach (var task in incompleteTasks)
        {
            QueueAiTask(task);
            results.Add($"{task.Task} {task.TaskId}");
        }

        return results;
    }

    public void RemoveGeneration(string generationId)
    {
        QueuedGenerations.Remove(generationId, out _);
    }
}

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
