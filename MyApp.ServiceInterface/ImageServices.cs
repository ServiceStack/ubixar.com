using System.Net;
using Microsoft.Extensions.Logging;
using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.OrmLite;
using ServiceStack.Text;
using SkiaSharp;

namespace MyApp.ServiceInterface;

public class ImageServices(ILogger<ImageServices> log, AppData appData, AgentEventsManager agentManager) : Service
{
    public async Task<object> Post(GenerateImage request)
    {
        try
        {
            request.AspectRatio ??= "9:16";
            GenerateImageResponse? dto = null;

            if (request.Model.Contains('/') && !request.Model.StartsWith("llmspy/"))
            {
                dto = await GenerateImageWithOpenRouter(request);
            }
            else
            {
                dto = await GenerateImageWithComfyUI(request);
            }

            var userId = Request.GetRequiredUserId();
            var media = new PublishedMedia
            {
                Type = AssetType.Image,
                Name = request.Model.LastRightPart('/').Replace('-', ' '),
                Prompt = request.Prompt,
                AspectRatio = request.AspectRatio,
                Model = request.Model,
                RemoteIp = Request.UserHostAddress,
                Created = DateTime.UtcNow,
                PublishedAt = DateTime.UtcNow,
                PublishedBy = userId,
                ExternalRef = PreciseTimestamp.UniqueTimestamp.EncodeBase64Url(),
            };
            media.PublishedUrl = Request.ResolveAbsoluteUrl($"~/m/{media.ExternalRef}");
            
            var imageBytes = Convert.FromBase64String(dto.Data[0].B64Json);
            var ext = MimeTypes.GetExtension(dto.Data[0].MediaType);
            if (ext == "jpeg")
                ext = "jpg";
            var name = request.Model.LastRightPart('/') + "." +media.ExternalRef + "." + ext;
            var downloadDir = appData.Config.AppDataPath.CombineWith("downloads");
            downloadDir.AssertDir();
            await File.WriteAllBytesAsync(downloadDir.CombineWith(name), imageBytes);
            
            // convert to webp
            using var bitmap = SKBitmap.Decode(imageBytes);
            if (bitmap == null)
                throw HttpError.BadRequest("Could not decode image");
            
            media.Width = bitmap.Width;
            media.Height = bitmap.Height;

            using var webpData = bitmap.Encode(SKEncodedImageFormat.Webp, 90);
            if (webpData == null)
                throw HttpError.BadRequest("Could not encode image as WebP");

            media.Hash = webpData.ToSha256Hash();
            var mediaFileName = media.Hash + ".webp";
            media.Url = "/cache/" + mediaFileName;
            
            var webpFilePath = appData.GetCachePath(mediaFileName);
            if (!File.Exists(webpFilePath))
            {
                await webpData.SaveToAsync(webpFilePath);
            }
            media.Size = (int) new FileInfo(webpFilePath).Length;
            
            media.Cost = dto.Usage.Cost;

            media.Id = (int) await Db.InsertAsync(media, selectIdentity:true);
            
            var thread = new ServiceModel.Thread
            {
                Url = media.PublishedUrl,
                Description = media.Name,
                RefId = media.Id,
            }.WithAudit(by:Request.GetRequiredUserId());
            thread.Id = (int) await Db.InsertAsync(thread, selectIdentity: true);
            
            await Db.UpdateOnlyAsync(() => new PublishedMedia { PublicThreadId = thread.Id }, 
                where: x => x.Id == media.Id);
            
            log.LogDebug("Converted {OrigExt} to WebP ({FileSize}) as {FileName}",
                ext, new FileInfo(webpFilePath).Length, mediaFileName);

            agentManager.QueuePublishedMedia(media, userId);
            
            return dto;
        }
        catch (Exception e)
        {
            Console.WriteLine(e);
            throw;
        }
    }

    private static async Task<GenerateImageResponse> GenerateImageWithOpenRouter(GenerateImage request)
    {
        var imageGenerationUrl = "https://openrouter.ai/api/v1/images";

        var json = await imageGenerationUrl.PostJsonToUrlAsync(
            request, 
            requestFilter: req => 
                req.AddHeader("Authorization", $"Bearer {Environment.GetEnvironmentVariable("OPENROUTER_API_KEY")}"));
        var dto = json.FromJson<GenerateImageResponse>();
        return dto;
    }

    private async Task<GenerateImageResponse> GenerateImageWithComfyUI(GenerateImage request)
    {
        var workflow = appData.GetWorkflowBySlug(request.Model);
        var workflowVersion = workflow != null
            ? appData.WorkflowVersions.FirstOrDefault(x => x.ParentId == workflow.Id)
            : null;
        if (workflowVersion == null)
            throw HttpError.NotFound($"'{request.Model}' not found");
        
        var width = request.AspectRatio.LeftPart(':').ToInt();
        var height = request.AspectRatio.RightPart(':').ToInt();
        var args = new Dictionary<string, object?>
        {
            ["positivePrompt"] = request.Prompt,
            ["width"] = width > height ? 1344 : height > width ? 768 : 1024,
            ["height"] = height > width ? 1344 : width > height ? 768 : 1024,
            ["seed"] = workflowVersion.Info.GetNextSeedValue(),
            ["batch_size"] = request.N ?? 1,
        };
        await using var comfyServices = HostContext.ResolveService<ComfyServices>(Request);
        var queuedResponse = await comfyServices.Post(new QueueWorkflow
        {
            WorkflowId = workflowVersion.ParentId,
            VersionId = workflowVersion.Id,
            Args = args,
            Description = request.Prompt,
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
                var dto = new GenerateImageResponse
                {
                    Created = DateTime.UtcNow.ToUnixTimeMs(),
                    Data = [],
                    Usage = new()
                    {
                        PromptTokens = 0,
                        CompletionTokens = 0,
                        TotalTokens = 0,
                        Cost = 0,
                    }
                };
                        
                foreach (var asset in gen.Result!.Assets!)
                {
                    var artifactPath = appData.GetArtifactPath(asset.Url.LastRightPart('/'));
                    if (!File.Exists(artifactPath))
                        throw HttpError.NotFound($"Artifact not found: {artifactPath}");
                    var assetBytes = await File.ReadAllBytesAsync(artifactPath);
                    var base64Data = Convert.ToBase64String(assetBytes);
                    dto.Data.Add(new() {
                        B64Json = base64Data,
                        MediaType = MimeTypes.GetMimeType(artifactPath),
                    });
                    using var assetBitmap = SKBitmap.Decode(assetBytes);
                    var outputTokens = ImageUtils.AnthropicTokens(assetBitmap.Width, assetBitmap.Height);
                    dto.Usage.CompletionTokens += outputTokens;
                    dto.Usage.TotalTokens += outputTokens;
                    dto.Usage.Cost += 0.03;
                }
                return dto;
            }

            var timeRemainingMs = waitForSecs * 1000 - (int) (DateTime.UtcNow - startedAt).TotalMilliseconds;
            if (timeRemainingMs <= 0)
                throw new TimeoutException("Timed out waiting for generation");
            await agentManager.WaitForUpdatedGenerationAsync(timeRemainingMs);
        } while(true);
    }
}