using System.Net;
using Microsoft.Extensions.Logging;
using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.OrmLite;
using ServiceStack.Text;
using SkiaSharp;

namespace MyApp.ServiceInterface;

public class ChatServices(ILogger<ChatServices> log, AppData appData, AgentEventsManager agentManager) : Service
{
    public async Task<object> Post(ChatCompletion request)
    {
        var userId = Request.GetRequiredUserId();
        if (request.Messages == null || request.Messages.Count == 0)
            throw HttpError.BadRequest("Messages cannot be empty");
        
        // Only support Modalities[0] = 'text' and Modalities[1] = 'audio' modalities for now:
        if (request.Modalities is ["text", "audio"])
        {
            var lastMessage = request.Messages.Last();
            if (lastMessage.Role != "user")
                throw HttpError.BadRequest("Last message must be from the user");
            if (lastMessage.Content?[0] is AiTextContent textContent)
            {
                var prompt = textContent.Text;
                if (string.IsNullOrWhiteSpace(prompt))
                    throw HttpError.BadRequest("Prompt cannot be empty");
                
                var workflow = appData.GetWorkflowBySlug(request.Model);
                var workflowVersion = workflow != null
                    ? appData.WorkflowVersions.FirstOrDefault(x => x.ParentId == workflow.Id)
                    : null;
                if (workflowVersion == null)
                    throw HttpError.NotFound($"'{request.Model}' not found");
                
                var args = new Dictionary<string, object?>
                {
                    ["positivePrompt"] = prompt,
                    ["seed"] = workflowVersion.Info.GetNextSeedValue(),
                    ["batch_size"] = request.N ?? 1,
                };
                await using var comfyServices = HostContext.ResolveService<ComfyServices>(Request);
                var queuedResponse = await comfyServices.Post(new QueueWorkflow
                {
                    WorkflowId = workflowVersion.ParentId,
                    VersionId = workflowVersion.Id,
                    Args = args,
                    Description = prompt,
                });
                var clientId = queuedResponse.Id;
                var q = Db.From<WorkflowGeneration>()
                    .Where(x => x.Id == clientId && (x.Result != null || x.Error != null));
                var startedAt = DateTime.UtcNow;
                var waitForSecs = 240;
             
                do
                {
                    var updatedGenerations = Db.Select(q);
                    if (updatedGenerations.Count > 0)
                    {
                        var gen = updatedGenerations[0];
                        if (gen.Result == null && gen.Error != null)
                            throw new HttpError(gen.Error, HttpStatusCode.InternalServerError);
                        if (gen.Result?.Assets?.Count == 0)
                            throw HttpError.BadRequest("No assets returned from generation");
                        var dto = new ChatResponse
                        {
                            Created = DateTime.UtcNow.ToUnixTimeMs(),
                            Usage = new()
                            {
                                PromptTokens = 0,
                                CompletionTokens = 0,
                                TotalTokens = 0,
                                // Cost = 0,
                            },
                            Choices = new(),
                        };
                        
                        /*
                         * {"duration":"PT7.706S","assets":[{"nodeId":"13","url":"/artifacts/941025cf6f430401a2bd9ab5e67654cac4163e69dd84dac9967e29f94c3fe08d.m4a","type":"Audio","fileName":"ComfyUI_00001_.m4a","codec":"aac","duration":48.019002,"bitrate":191485,"streams":1,"programs":0}]}
                         */

                        var count = 0;
                        foreach (var asset in gen.Result!.Assets!)
                        {
                            count++;
                            if (asset.Type == AssetType.Audio)
                            {
                                var outputTokens = EstimateAudioTokens(asset);
                                dto.Usage.CompletionTokens += outputTokens;
                                dto.Usage.TotalTokens += outputTokens;
                                var assetFileName = asset.Url.LastRightPart('/');
                                var artifactPath = appData.GetArtifactPath(assetFileName);
                                var audioBytes = await File.ReadAllBytesAsync(artifactPath);
                                var b64Audio = Convert.ToBase64String(audioBytes);
                                dto.Choices.Add(new Choice
                                {
                                    Index = count,
                                    FinishReason = "stop",
                                    Message = new ChoiceMessage
                                    {
                                        Role = "assistant",
                                        Audio = new ChoiceAudio
                                        {
                                            Id = $"audio_{count}",
                                            Data = b64Audio,
                                            ExpiresAt = DateTime.UtcNow.AddDays(1).ToUnixTime(),
                                        },
                                    }
                                });
                            }
                        }
                        
                        return dto;
                    }

                    var timeRemainingMs = waitForSecs * 1000 - (int) (DateTime.UtcNow - startedAt).TotalMilliseconds;
                    if (timeRemainingMs <= 0)
                        throw new TimeoutException("Timed out waiting for generation");
                    await agentManager.WaitForUpdatedGenerationAsync(timeRemainingMs);
                } while(true);
                
            }
            else throw HttpError.BadRequest("Last message content must be of type 'text'");
        }
        throw HttpError.BadRequest("Only 'text' and 'audio' modalities are supported");    
    }
    
    public static int EstimateAudioTokens(ComfyAssetOutput metadata)
    {
        // Safe check: If there's no duration metadata, we can't estimate tokens
        if (metadata?.Duration == null || metadata.Duration <= 0)
        {
            return 0;
        }

        double duration = metadata.Duration.Value;
        double tokensPerSecond = 20.0;

        // switch (provider)
        // {
        //     case Provider.OpenAI:
        //         // Input is 10 tokens/sec, Output is 20 tokens/sec
        //         tokensPerSecond = isOutput ? 20.0 : 10.0;
        //         break;
        //
        //     case Provider.Gemini:
        //         // Gemini charges a flat 32 tokens/sec for input audio
        //         tokensPerSecond = 32.0;
        //         break;
        //
        //     default:
        //         throw new ArgumentException("Unsupported provider specified.");
        // }

        // Use Math.Ceiling to make sure we round up for fractional seconds
        return (int)Math.Ceiling(duration * tokensPerSecond);
    }    
}