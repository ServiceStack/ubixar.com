using Microsoft.Extensions.Logging;
using MyApp.Data;
using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.Data;
using ServiceStack.OrmLite;
using ServiceStack.Text;
using SkiaSharp;

namespace MyApp.ServiceInterface;

public class AdminServices(ILogger<AdminServices> log, 
    AppData appData, AppConfig appConfig, AgentEventsManager agentEvents, IDbConnectionFactory dbFactory) : Service
{
    public object Post(FixGenerations request)
    {
        var take = request.Take ?? 1;
        
        var to = new StringsResponse();
        
        if (request.Type == "FixArgs")
        {
            var rows = Db.SqlList<(string Id, string Args)>(
                $"""
                 SELECT "Id", "Args" 
                   FROM "WorkflowGeneration" 
                  WHERE "Args" 
                   LIKE '%"A breathtaking full-body portrait of a woman wearing a dazzling,%'
                  ORDER BY LENGTH("Args") DESC
                  LIMIT {take}
                 """);

            foreach (var row in rows)
            {
                var args = (Dictionary<string,object?>) JSON.parse(row.Args);
                var updatedArgs = new Dictionary<string, object?>();
                foreach (var entry in args)
                {
                    if (entry.Key.Length <= 30)
                    {
                        updatedArgs[entry.Key] = entry.Value;
                    }
                }
                if (args.Count != updatedArgs.Count)
                {
                    Db.UpdateOnly(() => new WorkflowGeneration {
                        Args = updatedArgs,
                    }, where: x => x.Id == row.Id);
                    to.Results.Add($"Updated {row.Id}");
                }
            }
        }
        else if (request.Type == "FixAudioMetadata")
        {
            var audioAssets = Db.Select(Db.From<Artifact>().Where(x => x.Type == AssetType.Audio).Take(take));
            var generationIds = audioAssets.Select(x => x.GenerationId).ToSet();
            var generations = Db.Select(Db.From<WorkflowGeneration>().Where(x => generationIds.Contains(x.Id)));
                
            foreach (var audioAsset in audioAssets)
            {
                var generation = generations.FirstOrDefault(x => x.Id == audioAsset.GenerationId);
                if (generation == null) 
                    throw HttpError.NotFound($"Generation not found: {audioAsset.GenerationId}");

                var asset = generation.Result?.Assets?.Find(x => x.Url == audioAsset.Url);
                if (asset == null) 
                    throw HttpError.NotFound($"Asset not found: {audioAsset.Url}");
                audioAsset.Description = generation.Description;
                audioAsset.Audio = new AudioInfo
                {
                    Codec = asset.Codec,
                    Duration = asset.Duration,
                    Length = asset.Length,
                    Bitrate = asset.Bitrate,
                    Streams = asset.Streams,
                    Programs = asset.Programs,
                };
                    
                Db.UpdateOnly(() => new Artifact {
                    Description = audioAsset.Description,
                    Audio = audioAsset.Audio,
                }, where: x => x.Id == audioAsset.Id);
                to.Results.Add($"Updated {generation.Id}");
            }
        }

        return to;
    }

    public object Post(UpdateAudioTags request)
    {
        var artifact = Db.Single(Db.From<Artifact>().Where(x => x.Url == request.ArtifactPath));
        if (artifact == null)
            throw HttpError.NotFound("Artifact not found");

        var generation = Db.SingleById<WorkflowGeneration>(artifact.GenerationId);
        if (generation == null)
            throw HttpError.NotFound("Generation not found");
        
        if (!(request.ArtifactTags?.Count > 0))
            throw HttpError.BadRequest("No tags provided");
        
        var categories = ComfyConverters.GetAudioCategories(request.ArtifactTags);
        
        Db.Delete<ArtifactCategory>(x => x.ArtifactId == artifact.Id);
        Db.Delete<ArtifactTag>(x => x.ArtifactId == artifact.Id);
        
        artifact.Tags = request.ArtifactTags;
        artifact.Categories = categories;

        // Recreate Artifact Categories
        if (!Db.Exists<ArtifactCategory>(x => x.ArtifactId == artifact.Id))
        {
            Db.InsertArtifactCategories(artifact, appData);
        }
        // Recreate Artifact Tags
        if (!Db.Exists<ArtifactTag>(x => x.ArtifactId == artifact.Id))
        {
            Db.InsertArtifactTags(artifact, appData);
        }
        
        Db.UpdateOnly(() => new Artifact {
            Tags = artifact.Tags,
            Categories = artifact.Categories,
        }, where: x => x.Id == artifact.Id);

        return new EmptyResponse();
    }
    
    public object Delete(HardDeleteWorkflow request)
    {
        var force = request.Force;
        var ret = new StringsResponse();
        var workflow = Db.SingleById<Workflow>(request.Id);
        if (workflow == null)
            throw HttpError.NotFound("Workflow not found");

        var workflowVersions = Db.Select<WorkflowVersion>(x => x.ParentId == request.Id);
        foreach (var workflowVersion in workflowVersions)
        {
            ret.Results.Add($"Deleted WorkflowVersion {workflowVersion.Id} {workflowVersion.Name}");
            if (force) Db.DeleteById<WorkflowVersion>(workflowVersion.Id);
        }
        
        var workflowGenerations = Db.Select<WorkflowGeneration>(x => x.WorkflowId == request.Id);
        foreach (var workflowGeneration in workflowGenerations)
        {
            ret.Results.Add($"Deleted WorkflowGeneration {workflowGeneration.Id}");
            if (force) Db.DeleteById<WorkflowGeneration>(workflowGeneration.Id);
        }
        
        ret.Results.Add($"Deleted Workflow {workflow.Id} {workflow.Name}");
        if (force) Db.DeleteById<Workflow>(request.Id);

        return ret;
    }
    
    public object Post(HardDeleteGenerations request)
    {
        var generationsToDelete = Db.Select(Db.From<WorkflowGeneration>()
            .Where(x => x.DeletedDate != null)
            .Limit(request.Limit)
            // .Where(x => x.DeletedDate < DateTime.UtcNow.AddDays(-30))
        );

        var ret = new HardDeleteGenerationsResponse
        {
            Effect = request.Delete
                ? "Deleted"
                : "Dry Run"
        };

        var generationIds = generationsToDelete.Map(x => x.Id);
        var assets = Db.Select(Db.From<Artifact>()
            .Where(x => generationIds.Contains(x.GenerationId)));
        
        foreach (var generation in generationsToDelete)
        {
            var result = new GenerationRef
            {
                Id = generation.Id,
                PositivePrompt = generation.Description,
                ArtifactUrls = assets.Where(x => x.GenerationId == generation.Id).Select(x => x.Url).ToList(),
                ArtifactPaths = assets.Where(x => x.GenerationId == generation.Id)
                    .Where(x => !x.Url.Contains('?'))
                    .Select(x => appData.GetArtifactPath(x.Url.LastRightPart('/'))).ToList(),
                PublicThreadId = generation.PublicThreadId,
            };
            ret.Results.Add(result);

            var variantsToAdd = appData.GetArtifactVariants(result.ArtifactPaths);
            foreach (var variantToAdd in variantsToAdd)
            {
                result.ArtifactPaths.AddIfNotExists(variantToAdd);
            }
        }

        if (request.Delete)
        {
            foreach (var generationRef in ret.Results)
            {
                foreach (var path in generationRef.ArtifactPaths)
                {
                    try
                    {
                        File.Delete(path);
                    }
                    catch (Exception e)
                    {
                        log.LogError(e, "Failed to delete artifact {Path}", path);
                        throw;
                    }
                }

                log.LogInformation("Deleting generation {Id} and associated artifacts", generationRef.Id);
                var deletedArtifactIds = Db.Column<int>(Db.From<Artifact>()
                    .Where(x => x.GenerationId == generationRef.Id).Select(x => x.Id));
                Db.DeleteByIds<Artifact>(deletedArtifactIds);
                Db.BulkInsert(deletedArtifactIds.Map(x => new DeletedRow { Table = Table.Artifact, Key = $"{x}" }));
                Db.Delete(Db.From<WorkflowGeneration>().Where(x => x.Id == generationRef.Id));
                if (generationRef.PublicThreadId != null)
                {
                    var threadCommentIds = Db.Column<int>(Db.From<Comment>()
                        .Where(x => x.ThreadId == generationRef.PublicThreadId).Select(x => x.Id));
                    
                    Db.Delete<CommentReaction>(x => threadCommentIds.Contains(x.CommentId));
                    Db.Delete<CommentReport>(x => threadCommentIds.Contains(x.CommentId));
                    Db.Delete(Db.From<Comment>().Where(x => x.ThreadId == generationRef.PublicThreadId));
                    //Db.Delete(Db.From<ThreadReaction>().Where(x => x.ThreadId == generationRef.PublicThreadId));
                    Db.Delete(Db.From<ServiceModel.Thread>().Where(x => x.Id == generationRef.PublicThreadId));
                }
                Db.BulkInsert(generationIds.Map(x => new DeletedRow { Table = Table.WorkflowGeneration, Key = x }));
            }
        }

        return ret;
    }

    public object Any(HardDeleteWorkflowGeneration request)
    {
        var generationId = request.Id;
        var artifacts = Db.Select(Db.From<Artifact>()
            .Where(x => x.GenerationId == request.Id));

        agentEvents.RemoveGeneration(generationId);

        if (artifacts.Count == 0)
        {
            log.LogInformation("Deleting generation {Id} with no associated artifacts", generationId);
            Db.DeleteWorkflowGeneration(generationId);
            return new StringResponse { Result = $"Deleted {generationId}" };
        }

        var artifactPaths =appData.DeleteArtifactFiles(artifacts.Map(x => x.Url));
        
        log.LogInformation("Deleting generation {Id} and associated artifacts", generationId);
        var ret = new StringResponse();
        Db.DeleteArtifacts(artifacts.Map(x => x.Id));
        
        Db.DeleteById<WorkflowGeneration>(generationId);
        Db.Insert(new DeletedRow { Table = Table.WorkflowGeneration, Key = generationId });

        ret.Result = $"Deleted {generationId}, {artifacts.Count} artifacts and {artifactPaths.Count} associated files";

        return ret;
    }

    public object Any(HardDeleteArtifact request)
    {
        var artifactId = request.ArtifactId;
        var artifactPaths = appData.DeleteArtifact(Db, artifactId);

        return new StringsResponse
        {
            Results = artifactPaths
        };
    }

    public object Any(DeleteMissingArtifacts request)
    {
        var allArtifacts = Db.Select<Artifact>();

        var allArtifactPaths = allArtifacts.Map(x => 
            appData.GetArtifactPath(x.Url.LastRightPart('/')));
        
        var missingArtifacts = new List<Artifact>();
        foreach (var artifact in allArtifacts)
        {
            var artifactPath = appData.GetArtifactPath(artifact.Url.LastRightPart('/')); 
            if (!File.Exists(artifactPath))
            {
                missingArtifacts.Add(artifact);
            }
        }

        if (request.Delete)
        {
            foreach (var missingArtifact in missingArtifacts)
            {
                appData.DeleteArtifact(Db, missingArtifact);
            }
        }

        return new StringsResponse
        {
            Results = missingArtifacts.Map(x => x.Url),
        };
    }
    
    public object Any(DeleteDuplicateArtifacts request)
    {
        var urlCounts = Db.Dictionary<string, int>(Db.From<Artifact>()
            .GroupBy(x => x.Url)
            .Having("COUNT(Url) > 1")
            .Select(x => new { x.Url, Count = Sql.Count(x.Url) }));

        var ret = new DeleteDuplicateArtifactsResponse
        {
            UrlCounts = urlCounts,
        };
        
        foreach (var url in urlCounts.Keys)
        {
            // Delete all but oldest Artifact with duplicate
            var artifacts = Db.Select(Db.From<Artifact>()
                .Where(x => x.Url == url)
                .OrderBy(x => x.CreatedDate));
            for (int i = 1; i < artifacts.Count; i++)
            {
                ret.DeletedArtifacts.Add(artifacts[i]);
                if (request.Delete)
                {
                    appData.DeleteArtifact(Db, artifacts[i]);
                }
            }
        }

        return ret;
    }

    public object Any(PopulateMissingArtifacts request)
    {
        var rowsUpdated = Db.ExecuteSql(
            """
            UPDATE Artifact
            SET Credits = (
                SELECT g.Credits / COUNT(a2.Id)
                FROM WorkflowGeneration g
                INNER JOIN Artifact a2 ON a2.GenerationId = g.Id
                WHERE g.Id = Artifact.GenerationId
                  AND g.Credits IS NOT NULL
                  AND g.Credits > 0
                GROUP BY g.Id, g.Credits
            )
            WHERE EXISTS (
                SELECT 1
                FROM WorkflowGeneration g
                WHERE g.Id = Artifact.GenerationId
                  AND g.Credits IS NOT NULL
                  AND g.Credits > 0
                  AND Artifact.Credits IS NULL
            )
            """);
        return new StringsResponse
        {
            Results = [$"Updated {rowsUpdated} rows"],
        };
    }

    public object Any(RegenerateGenerationResults request)
    {
        var generations = Db.Select<WorkflowGeneration>();
        var artifacts = Db.Select<Artifact>();
        
        var userId = Request.GetRequiredUserId();
        var now = DateTime.UtcNow;
        
        foreach (var generation in generations)
        {
            if (generation.Outputs == null) continue;
            
            var prompt = (generation.Args?.GetValueOrDefault("positivePrompt") ?? generation.Description) as string;
            var minRating = appData.GetMinRatingForPrompt(prompt);
            var result = ComfyConverters.GetOutputs(generation.Outputs, minRating);
            
            if (result.Assets?.Count > 0)
            {
                foreach (var asset in result.Assets)
                {
                    var artifact = artifacts.Find(x => x.GenerationId == generation.Id && x.FileName == asset.FileName);
                    if (artifact != null)
                    {
                        asset.Url = artifact.Url;
                    }
                }
            }
            
            Db.UpdateOnly(() => new WorkflowGeneration {
                Result = result,
                ModifiedBy = userId,
                ModifiedDate = now,
            }, where: x => x.Id == generation.Id);
        }

        return new StringResponse { Result = $"{generations.Count} generations updated" };
    }

    public object Any(RequeueFailedThreadGenerations request)
    {
        var thread = Db.SingleById<ServiceModel.Thread>(request.ThreadId);
        if (thread == null)
            throw HttpError.NotFound("Thread could not be found");
        
        var userId = Request.GetRequiredUserId();
        var now = DateTime.UtcNow;
        
        var updated = Db.UpdateOnly(() => new WorkflowGeneration
        {
            DeviceId = null,
            PromptId = null,
            ModifiedBy = userId,
            ModifiedDate = now,
            Error = null,
            Result = null,
            Status = null,
            Outputs = null,
            StatusUpdate = GenerationStatus.ReAddedToAgentsPool,
        }, where: x => x.ThreadId == request.ThreadId && x.Error != null);
        
        agentEvents.SignalGenerationUpdated();

        return new StringResponse
        {
            Result = $"requeued {updated} failed generations for thread {thread.Id}",
        };
    }

    public object Any(Clean request)
    {
        var force = request.Force;
        using var db = Db;
        var ret = new CleanResponse();
        var artifacts = db.Select<Artifact>();
        var matchingArtifactIds = new List<int>();
        
        var ArtifactsPath = appConfig.ArtifactsPath;
        var files = Directory.GetFiles(ArtifactsPath, "*.json", SearchOption.AllDirectories);
        foreach (var filePath in files)
        {
            var json = File.ReadAllText(filePath);
            var metadata = json.FromJson<ArtifactMetadata>();
            if (metadata.FileName != null)
            {
                var artifactUrl = "/artifacts".CombineWith(metadata.FileName);
                var matchingArtifacts = artifacts.Where(x => x.Url == artifactUrl).ToList();
                var artifact = matchingArtifacts.FirstOrDefault();
                if (matchingArtifacts.Count > 1)
                {
                    ret.MultipleDbArtifacts[artifactUrl] = matchingArtifacts.Select(x => x.Id).ToArray();
                }
                matchingArtifactIds.AddRange(matchingArtifacts.Select(x => x.Id));
                if (artifact == null)
                {
                    ret.MissingDbArtifacts.AddIfNotExists(artifactUrl);
                }
            }
            else
            {
                ret.Errors.Add($"No filename in {filePath}");
            }
        }
        
        var generations = db.Select<WorkflowGeneration>();
        foreach (var generation in generations)
        {
            // Ignore pending generations
            if (generation.Result != null) continue;
            // Ignore failed generations
            if (generation.Error != null) continue;
            
            if (generation.Result?.Assets?.Count > 0)
            {
                var removeUrls = new List<string>();
                foreach (var asset in generation.Result.Assets)
                {
                    var fileName = asset.Url.LastRightPart('/');
                    if (!File.Exists(appData.GetArtifactPath(fileName)))
                    {
                        removeUrls.Add(asset.Url);
                    }
                }
                if (removeUrls.Count > 0)
                {
                    generation.Result.Assets.RemoveAll(x => removeUrls.Contains(x.Url)); 
                    ret.MissingGenerationFiles.AddDistinctRange(removeUrls);
                    if (force)
                    {
                        if (generation.Result.Assets.Count > 0)
                        {
                            db.UpdateOnly(() => new WorkflowGeneration {
                                Result = generation.Result
                            }, where: x => x.Id == generation.Id);
                        }
                        else
                        {
                            db.DeleteById<WorkflowGeneration>(generation.Id);
                            db.Insert(new DeletedRow { Table = Table.WorkflowGeneration, Key = generation.Id });
                            ret.Actions.Add($"Deleted empty generation {generation.Id}");
                        }
                    }
                }
            }
            if (generation is { Result.Assets.Count: 0 })
            {
                ret.EmptyGenerations.Add(generation.Id);
                if (force)
                {
                    db.DeleteById<WorkflowGeneration>(generation.Id);
                    db.Insert(new DeletedRow { Table = Table.WorkflowGeneration, Key = generation.Id });
                    ret.Actions.Add($"Deleted empty generation {generation.Id}");
                }
            }
        }
        ret.Summary["Missing Generation Files"] = ret.MissingGenerationFiles.Count;

        ret.Summary["Missing DB Artifacts"] = ret.MissingDbArtifacts.Count;
        foreach (var missingDbArtifact in ret.MissingDbArtifacts)
        {
            var fileName = missingDbArtifact.LastRightPart('/');
            var fileNameWithoutExt = fileName.LastLeftPart('.');
            var dir = ArtifactsPath.CombineWith(fileName[..2]);
            var variantPaths = Directory.GetFiles(dir, fileNameWithoutExt + "*", SearchOption.AllDirectories);
            foreach (var variantPath in variantPaths)
            {
                try
                {
                    if (force) File.Delete(variantPath);
                    ret.Actions.Add($"Deleted {variantPath}");
                }
                catch (Exception e)
                {
                    ret.Errors.Add($"Failed to delete artifact {variantPath}: {e.Message}");
                }
            }
        }

        ret.Summary["Multiple DB Artifacts"] = ret.MultipleDbArtifacts.Count;
        foreach (var multipleDbArtifact in ret.MultipleDbArtifacts)
        {
            var (artifactUrl, artifactIds) = multipleDbArtifact;
            //Console.WriteLine($"Multiple Artifacts for {artifactUrl}: {artifactIds.Length} ({artifactIds.Join(",")})");
            var allExceptFirst = artifactIds.Skip(1).ToList();
            if (force)
            {
                db.DeleteArtifacts(allExceptFirst);
            }
            ret.Actions.Add($"Deleted duplicate {allExceptFirst.Count} artifacts: {allExceptFirst.Join(",")}");
        }

        var missingFileArtifacts = artifacts.Where(x => !matchingArtifactIds.Contains(x.Id)).ToList();
        ret.Summary["Missing File Artifacts"] = missingFileArtifacts.Count;
        foreach (var missingFileArtifact in missingFileArtifacts)
        {
            if (force)
            {
                db.DeleteArtifact(missingFileArtifact.Id);
            }
            ret.Actions.Add($"No File: Deleted Artifact {missingFileArtifact.Id}: {missingFileArtifact.Url}");
            if (force)
            {
                db.Delete<WorkflowGeneration>(x => x.Id == missingFileArtifact.GenerationId);
                db.Insert(new DeletedRow { Table = Table.WorkflowGeneration, Key = $"{missingFileArtifact.GenerationId}" });
            }
            ret.Actions.Add($"No File: Deleted WorkflowGeneration {missingFileArtifact.GenerationId}");
        }

        var emptyGenerationIds = db.SqlColumn<string>(
            "SELECT \"Id\" FROM \"WorkflowGeneration\" wg WHERE NOT EXISTS (SELECT 1 from \"Artifact\" a WHERE a.\"GenerationId\" = wg.\"Id\" AND \"Result\" IS NOT NULL)");
        if (emptyGenerationIds.Count > 0)
        {
            if (force)
            {
                db.DeleteByIds<WorkflowGeneration>(emptyGenerationIds);
                db.BulkInsert(emptyGenerationIds.Map(x => new DeletedRow { Table = Table.WorkflowGeneration, Key = x }));
            }
            ret.Actions.Add($"Deleted {emptyGenerationIds.Count} empty generations");
        }
        return ret;
    }

    public object Post(RecreateArtifactCategories request)
    {
        Db.DeleteAll<ArtifactCategory>();
        var allPublishedArtifacts = Db.Select<Artifact>(x => x.PublishedDate != null && x.DeletedDate == null);
        var artifactCategoriesCreated = 0;
        foreach (var artifact in allPublishedArtifacts)
        {
            Db.InsertArtifactCategories(artifact, appData);
            artifactCategoriesCreated += artifact.Categories?.Count ?? 0;
        }

        return new StringResponse
        {
            Result = $"Recreated {artifactCategoriesCreated} artifact categories for {allPublishedArtifacts.Count} artifacts",
        };
    }

    public object Post(RecreateArtifactTags request)
    {
        Db.DeleteAll<ArtifactTag>();
        var allPublishedArtifacts = Db.Select<Artifact>(x => x.PublishedDate != null && x.DeletedDate == null);
        var artifactTagsCreated = 0;
        foreach (var artifact in allPublishedArtifacts)
        {
            Db.InsertArtifactTags(artifact, appData);
            artifactTagsCreated += artifact.Tags?.Count ?? 0;
        }

        return new StringResponse
        {
            Result = $"Recreated {artifactTagsCreated} artifact tags for {allPublishedArtifacts.Count} artifacts",
        };
    }

    public object Any(CreateMissingArtifactTags request)
    {
        using var db = Db;
        var artifactIds = db.SqlColumn<int>("SELECT Id FROM Artifact WHERE NOT EXISTS (SELECT 1 FROM ArtifactTag where ArtifactId = Artifact.Id)");
        var artifactTagsCreated = 0;
        var origTagsCreated = appData.Tags.Count;
        foreach (var artifactId in artifactIds)
        {
            var artifact = Db.SingleById<Artifact>(artifactId);
            Db.InsertArtifactTags(artifact, appData);
            artifactTagsCreated += artifact.Tags?.Count ?? 0;
        }
        
        return new CreateMissingArtifactTagsResponse
        {
            TagsCreated = origTagsCreated - appData.Tags.Count,
            ArtifactTagsCreated = artifactTagsCreated,
        };
    }

    public object Any(CreateMissingArtifactCategories request)
    {
        using var db = Db;
        var artifactIds = db.SqlColumn<int>("SELECT Id FROM Artifact WHERE NOT EXISTS (SELECT 1 FROM ArtifactCategory where ArtifactId = Artifact.Id)");
        var artifactCategoriesCreated = 0;
        var origCategoriesCreated = appData.Tags.Count;
        foreach (var artifactId in artifactIds)
        {
            var artifact = Db.SingleById<Artifact>(artifactId);
            Db.InsertArtifactCategories(artifact, appData);
        }
        
        return new CreateMissingArtifactCategoriesResponse
        {
            CategoriesCreated = origCategoriesCreated - appData.Tags.Count,
            ArtifactCategoriesCreated = artifactCategoriesCreated,
        };
    }

    public object Any(SendCaptionArtifactEvent request)
    {
        var model = request.Model ?? "qwen2.5vl:7b";
        var nextArtifactUrls = Db.ColumnDistinct<string>(Db.From<Artifact>()
            .Where(x => x.Caption == null && (request.ArtifactIds == null || request.ArtifactIds.Contains(x.Id)))
            .OrderBy(x => x.Id)
            .Take(request.Take ?? 1)
            .Select(x => x.Url));

        var ret = new StringsResponse();

        var agents = agentEvents.GetComfyAgents(new(LanguageModel: model));
        if (agents.Count == 0)
            throw HttpError.NotFound("No active agent available that supports this model");

        var agentEventCounts = agentEvents.GetAgentEventsCount();
        var queuedUrls = new HashSet<string>();
        var allAgentEvents = agentEvents.GetAllAgentEvents();
        foreach (var msg in allAgentEvents)
        {
            if (msg.Name == EventMessages.CaptionImage && msg.Args?.TryGetValue("url", out var url) == true && url != null)
            {
                queuedUrls.Add(url);
            }
        }
        
        var i = 0;
        foreach (var nextArtifactUrl in nextArtifactUrls)
        {
            if (queuedUrls.Contains(nextArtifactUrl))
                continue;
            
            // Order Agents By Min Count
            agents = agents.OrderBy(x => agentEventCounts.GetValueOrDefault(x.DeviceId, 0)).ToList();
            
            var agent = agents.FirstOrDefault();
            if (agent == null)
                continue;
            
            ret.Results.Add(agent.DeviceId + " " + nextArtifactUrl);
            agentEvents.Enqueue(agent.DeviceId, new AgentEvent
            {
                Name = EventMessages.CaptionImage,
                Args = new() {
                    ["url"] = nextArtifactUrl,
                    ["model"] = model,
                }
            });
            agentEventCounts[agent.DeviceId]++;
        }
        
        return ret;
    }

    public object Any(ReloadAgentEvents request)
    {
        agentEvents.Reload(Db);
        return new StringResponse
        {
            Result = $"Reloaded {agentEvents.QueuedGenerations.Count} pending generations, {agentEvents.AiTasks.Count} pending tasks"
        };
    }

    public object Any(GenerateCaptionArtifact request)
    {
        var userId = Request.GetRequiredUserId();
        
        using var db = Db;
        var results = agentEvents.RequeueCaptionTasks(db, userId, request.ArtifactIds, request.Take, request.Model);

        return new StringsResponse
        {
            Results = results,
        };
    }

    public object Any(CreateMissingAvatars request)
    {
        var usersMissingAvatars = Db.Select(Db.From<ApplicationUser>()
            .Where(x => x.ProfileUrl == null)
            .Select(x => new { x.Id, x.UserName }));
        var ret = new StringsResponse();
        foreach (var user in usersMissingAvatars)
        {
            var profileUrl = ImageCreator.Instance.CreateSvgDataUri((user.UserName ?? user.Email ?? user.Id)[0]);
            Db.UpdateOnly(() => new ApplicationUser
            {
                ProfileUrl = profileUrl,
            }, where: x => x.Id == user.Id);
            ret.Results.Add($"{user.Id} {user.UserName}");
        }
        return ret;
    }

    public object Any(MigrateToPostgres request)
    {
        using var db = Db;
        using var dbSqlite = dbFactory.OpenDbConnection("app.db");
        var ret = new StringsResponse();

        BulkInsertConfig? config = new BulkInsertConfig { Mode = BulkInsertMode.Sql };
        config = null;

        // db.DeleteAll<Workflow>();
        // db.ResetSequence<Workflow>(x => x.Id);
        // db.Insert(dbSqlite.Select<Workflow>(x => x.Id == 1).First());
        
        db.DeleteAll<ApiKeysFeature.ApiKey>();
        db.ResetSequence<ApiKeysFeature.ApiKey>(x => x.Id);
        db.BulkInsert(dbSqlite.Select<ApiKeysFeature.ApiKey>().OrderBy(x => x.Id), config);
        
        db.DeleteAll<CommentReport>();
        db.ResetSequence<CommentReport>(x => x.Id);
        // db.DeleteAll<CommentReaction>();
        // db.ResetSequence<CommentReaction>(x => x.Id);
        db.DeleteAll<Comment>();
        db.ResetSequence<Comment>(x => x.Id);
        db.DeleteAll<HiddenArtifact>();
        db.ResetSequence<HiddenArtifact>(x => x.Id);
        db.DeleteAll<ModerationQueue>();
        db.ResetSequence<ModerationQueue>(x => x.Id);
        // db.DeleteAll<ThreadReaction>();
        // db.ResetSequence<ThreadReaction>(x => x.Id);
        db.DeleteAll<ServiceModel.Thread>();
        db.ResetSequence<ServiceModel.Thread>(x => x.Id);
        db.DeleteAll<WorkflowGeneration>();
        db.ResetSequence<WorkflowGeneration>(x => x.Id);
        db.DeleteAll<WorkflowVersion>();
        db.ResetSequence<WorkflowVersion>(x => x.Id);
        db.DeleteAll<Workflow>();
        db.ResetSequence<Workflow>(x => x.Id);
        db.DeleteAll<Tag>();
        db.ResetSequence<Tag>(x => x.Id);
        db.DeleteAll<Category>();
        db.ResetSequence<Category>(x => x.Id);
        db.DeleteAll<ArtifactReaction>();
        db.ResetSequence<ArtifactReaction>(x => x.Id);
        db.DeleteAll<ArtifactCategory>();
        db.ResetSequence<ArtifactCategory>(x => x.Id);
        db.DeleteAll<ArtifactTag>();
        db.ResetSequence<ArtifactTag>(x => x.Id);
        db.DeleteAll<Artifact>();
        db.ResetSequence<Artifact>(x => x.Id);

        db.BulkInsert(dbSqlite.Select<Comment>().OrderBy(x => x.Id), config);
        // db.BulkInsert(dbSqlite.Select<CommentReaction>().OrderBy(x => x.Id), config);
        db.BulkInsert(dbSqlite.Select<CommentReport>().OrderBy(x => x.Id), config);
        db.BulkInsert(dbSqlite.Select<HiddenArtifact>().OrderBy(x => x.Id), config);
        db.BulkInsert(dbSqlite.Select<ModerationQueue>().OrderBy(x => x.Id), config);
        db.BulkInsert(dbSqlite.Select<ServiceModel.Thread>().OrderBy(x => x.Id), config);
        // db.BulkInsert(dbSqlite.Select<ThreadReaction>().OrderBy(x => x.Id), config);
        db.BulkInsert(dbSqlite.Select<Workflow>().OrderBy(x => x.Id), config);
        db.BulkInsert(dbSqlite.Select<WorkflowGeneration>().OrderBy(x => x.CreatedDate), config);
        db.BulkInsert(dbSqlite.Select<WorkflowVersion>().OrderBy(x => x.Id), config);
        db.BulkInsert(dbSqlite.Select<Category>().OrderBy(x => x.Id), config);
        db.BulkInsert(dbSqlite.Select<Tag>().OrderBy(x => x.Id), config);
        db.BulkInsert(dbSqlite.Select<ArtifactCategory>().OrderBy(x => x.Id), config);
        db.BulkInsert(dbSqlite.Select<ArtifactReaction>().OrderBy(x => x.Id), config);
        db.BulkInsert(dbSqlite.Select<ArtifactTag>().OrderBy(x => x.Id), config);
        db.BulkInsert(dbSqlite.Select<Artifact>().OrderBy(x => x.Id), config);
        
        return ret;
    }

    public object Post(AiChat request)
    {
        using var dbTasks = appData.OpenAiTaskDb();
        var userId = Request.GetRequiredUserId();
        var model = request.Model ?? appData.Config.ChatLanguageModel;
        var task = agentEvents.AddOpenAiPromptTask(dbTasks, userId, request.Prompt, request.SystemPrompt, model);
        return new StringResponse
        {
            Result = $"Enqueued Open AI Chat to Task {task.Id} {task.RefId}"
        };
    }

    public object Get(GetAiChat request)
    {
        using var dbTasks = appData.OpenAiTaskDb();
        var taskId = request.TaskId is null or 0 
            ? dbTasks.Scalar<long>(dbTasks.From<OpenAiChatTask>()
                .Select(x => Sql.Max(x.Id)))
            : request.TaskId;
        
        var task = dbTasks.SingleById<OpenAiChatTask>(taskId);
        if (task == null)
            throw HttpError.NotFound("Task not found");
        
        return new GetAiChatResponse
        {
            Result = task.Result ?? "",
            Response = request.IncludeDetails == true ? task.Response : null,
        };
    }

    public object Any(ResizeImages request)
    {
        // Resize to 768x1344 maintaining aspect ratio
        var targetWidth = request.Width ?? 768;
        var targetHeight = request.Height ?? 1344;
        var userId = Request.GetRequiredUserId();

        var ret = new StringsResponse();
        
        if (request.Id != null)
        {
            var generations = Db.Select<WorkflowGeneration>(x => x.Id == request.Id);
            ResizeGeneration(generations);
        }
        else
        {
            var generations = Db.Select(Db.From<WorkflowGeneration>()
                .Join<Artifact>((g,a) => g.Id == a.GenerationId)
                .Where<Artifact>(a => a.Width == 920)
                .OrderByDescending(x => x.CreatedDate)
                .Take(request.Limit ?? 1));
            ResizeGeneration(generations);
        }

        return ret;

        void ResizeGeneration(List<WorkflowGeneration> generations)
        {
            foreach (var generation in generations)
            {
                var artifacts = Db.Select(Db.From<Artifact>().Where(x => x.GenerationId == generation.Id));
                foreach (var artifact in artifacts)
                {
                    // Use SKIA to crop image to 768x1344
                    var fileName = artifact.Url.LastRightPart('/');
                    var artifactPath = appData.GetArtifactPath(fileName);
                    
                    if (!File.Exists(artifactPath))
                    {
                        ret.Results.Add($"File not found: {fileName}");
                        continue;
                    }

                    if (artifact.Width == targetWidth && artifact.Height == targetHeight)
                    {
                        ret.Results.Add($"Already resized: {fileName}");
                        continue;
                    }
                    
                    try
                    {
                        using var stream = File.OpenRead(artifactPath);
                        using var originalBitmap = SKBitmap.Decode(stream);
                        
                        if (originalBitmap == null)
                        {
                            ret.Results.Add($"Failed to decode: {fileName}");
                            continue;
                        }

                        var sourceWidth = originalBitmap.Width;
                        var sourceHeight = originalBitmap.Height;

                        // Calculate the scale factor to fill the target size (crop mode)
                        var scale = Math.Max((float)targetWidth / sourceWidth, (float)targetHeight / sourceHeight);
                        var scaledWidth = (int)(sourceWidth * scale);
                        var scaledHeight = (int)(sourceHeight * scale);

                        // Calculate crop position to center the image
                        var cropX = (scaledWidth - targetWidth) / 2;
                        var cropY = (scaledHeight - targetHeight) / 2;

                        // Create the output bitmap
                        using var outputBitmap = new SKBitmap(targetWidth, targetHeight);
                        using var canvas = new SKCanvas(outputBitmap);
                        using var paint = new SKPaint { IsAntialias = true };

                        // Clear the canvas
                        canvas.Clear(SKColors.Transparent);

                        // Calculate source and destination rectangles for center crop
                        var sourceRect = new SKRect(0, 0, sourceWidth, sourceHeight);
                        var destRect = new SKRect(-cropX, -cropY, scaledWidth - cropX, scaledHeight - cropY);

                        // Draw the scaled and cropped image
                        canvas.DrawBitmap(originalBitmap, sourceRect, destRect, paint);

                        using var image = SKImage.FromBitmap(outputBitmap);
                        using var data = image.Encode(SKEncodedImageFormat.Webp, 90);
                        
                        // Save cropped image
                        using var outputStream = File.Create(artifactPath);
                        data.SaveTo(outputStream);
                        
                        // Update artifact dimensions in database
                        Db.UpdateOnly(() => new Artifact {
                            Width = targetWidth,
                            Height = targetHeight,
                            ModifiedDate = DateTime.UtcNow,
                            ModifiedBy = userId,
                        }, where: x => x.Id == artifact.Id);
                        
                        ret.Results.Add($"{generation.Id[..4]} {fileName} {targetWidth}x{targetHeight} (cropped from {sourceWidth}x{sourceHeight})");
                    }
                    catch (Exception e)
                    {
                        log.LogError(e, "Failed to resize artifact {Path}", artifactPath);
                        ret.Results.Add($"Error resizing {fileName}: {e.Message}");
                    }
                }

                foreach (var asset in generation.Result?.Assets ?? [])
                {
                    if (asset.Type == AssetType.Image)
                    {
                        asset.Width = targetWidth;
                        asset.Height = targetHeight;
                    }
                }
                
                Db.UpdateOnly(() => new WorkflowGeneration {
                    Result = generation.Result,
                    ModifiedDate = DateTime.UtcNow,
                    ModifiedBy = userId,
                }, where: x => x.Id == generation.Id);
            }
        }
    }
}
