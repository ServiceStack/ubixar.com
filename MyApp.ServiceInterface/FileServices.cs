using ServiceStack;
using Microsoft.Extensions.Logging;
using SkiaSharp;
using MyApp.ServiceModel;
using ServiceStack.OrmLite;

namespace MyApp.ServiceInterface;

public class FileServices(
    ILogger<FileServices> log, 
    AppData appData) : Service
{
    public object Any(DownloadFile request)
    {
        var filePath = appData.Config.FilesPath.CombineWith(request.Path[..2], request.Path);
        if (!File.Exists(filePath))
            throw HttpError.NotFound("File not found");

        return new HttpResult(new FileInfo(filePath),
            asAttachment:request.Download == true);
    }
    
    public async Task<object> Any(GetUserAvatar request)
    {
        if (!string.IsNullOrEmpty(request.UserName))
        {
            var profilePath = Db.Scalar<string>(Db.From<User>()
                .Where(x => x.UserName == request.UserName)
                .Select(x => x.ProfileUrl));
            if (!string.IsNullOrEmpty(profilePath))
            {
                if (profilePath.StartsWith("data:"))
                {
                    var svg = ImageCreator.Instance.DataUriToSvg(profilePath);
                    return new HttpResult(svg, MimeTypes.ImageSvg);
                }
                if (profilePath.StartsWith('/'))
                {
                    return await GetProfileImageResultAsync(profilePath.LeftPart('?'));
                }
            }
        }
        return new HttpResult(Svg.GetImage(Svg.Icons.Users), MimeTypes.ImageSvg);
    }
    
    public async Task<HttpResult> GetProfileImageResultAsync(string profilePath)
    {
        var localProfilePath = appData.WebRootPath.CombineWith(profilePath);
        var file = new FileInfo(localProfilePath);
        if (file.Exists)
        {
            return new HttpResult(file, MimeTypes.GetMimeType(file.Extension));
        }
        return new HttpResult(Svg.GetImage(Svg.Icons.Users), MimeTypes.ImageSvg);
    }

    public object Any(GetAvatarFile request)
    {
        var filePath = appData.Config.AppDataPath.CombineWith("avatars", request.Path);
        if (!File.Exists(filePath))
            throw HttpError.NotFound($"Avatar not found: {filePath}");

        return new HttpResult(new FileInfo(filePath),
            asAttachment:request.Download == true);
    }

    public object Any(GetArtifact request)
    {
        var filePath = appData.Config.ArtifactsPath.CombineWith(request.Path[..2], request.Path);
        if (!File.Exists(filePath))
            throw HttpError.NotFound("Artifact not found");

        return new HttpResult(new FileInfo(filePath),
            asAttachment:request.Download == true);
    }

    private string? GetFilePath(string path)
    {
        var filePath = path.StartsWith("/pub")
            ? appData.Config.FilesPath.CombineWith(path)
            : path.StartsWith("/artifacts")
                ? appData.Config.ArtifactsPath.CombineWith(path.RightPart("/artifacts"))
                : null;
        return filePath;
    }

    public object Any(DeleteFile request)
    {
        var apiKeyId = ((ApiKeysFeature.ApiKey)Request.GetApiKey()).Id;
        var path = request.Path;
        var dir = path.LastLeftPart('/');
        var ownerKey = dir.LastRightPart('/');
        if (int.TryParse(ownerKey, out var ownerKeyId) && ownerKeyId == apiKeyId)
        {
            var filePath = GetFilePath(path);
            if (filePath == null)
                throw HttpError.Forbidden("Invalid Path");

            log.LogInformation("Deleting File {Path}", path);
            var fileInfo = new FileInfo(filePath);
            fileInfo.Delete();
        }
        else
        {
            throw HttpError.Forbidden("Invalid API Key for File");
        }
        return new EmptyResponse();
    }

    public object Any(DeleteFiles request)
    {
        if (request.Paths == null || request.Paths.Count == 0)
            throw new ArgumentException("No artifact paths specified", nameof(request.Paths));

        var to = new DeleteFilesResponse();
        var apiKeyId = ((ApiKeysFeature.ApiKey)Request.GetApiKey()).Id;
        foreach (var path in request.Paths)
        {
            var dir = path.LastLeftPart('/');
            var ownerKey = dir.LastRightPart('/');
            if (int.TryParse(ownerKey, out var ownerKeyId) && ownerKeyId == apiKeyId)
            {
                var filePath = GetFilePath(path);
                if (filePath == null)
                {
                    to.Failed.Add(path);
                    continue;
                }
                var fileInfo = new FileInfo(filePath);
                if (fileInfo.Exists)
                {
                    try
                    {
                        log.LogInformation("Deleting File {Path}", path);
                        fileInfo.Delete();
                        to.Deleted.Add(path);
                    }
                    catch (Exception e)
                    {
                        log.LogError(e, "Failed to delete file {FilePath}", filePath);
                        to.Failed.Add(path);
                    }
                }
                else
                {
                    to.Missing.Add(path);
                }
            }
            else
            {
                to.Failed.Add(path);
            }
        }
        return to;
    }

    public async Task<object> Any(GetVariant request)
    {
        var filePath = request.Path.StartsWith("pub")
            ? appData.Config.FilesPath.CombineWith(request.Path)
            : appData.Config.ArtifactsPath.CombineWith(request.Path[..2], request.Path);
        var file = new FileInfo(filePath);
        if (!file.Exists)
            throw HttpError.NotFound("Artifact not found");

        return await GetImageVariant(request, filePath, file);
    }

    private static async Task<object> GetImageVariant(GetVariant request, string filePath, FileInfo file)
    {
        var options = request.Variant.Split(',');
        int? width = null;
        int? height = null;
        foreach (var option in options)
        {
            var key = option.LeftPart('=');
            var right = option.RightPart('=');
            switch (key)
            {
                case "width":
                    width = int.Parse(right);
                    break;
                case "height":
                    height = int.Parse(right);
                    break;
                default:
                    throw HttpError.BadRequest("Invalid option");
            }
        }

        if (width == null && height == null)
            throw new NotSupportedException("width or height is required");

        var variantPath = filePath.WithoutExtension();
        variantPath += (width != null && height != null
            ? $"_{width}w{height}h"
            : width != null
                ? $"_{width}w"
                : $"_{height}h") + ".webp";

        var variantFile = new FileInfo(variantPath);
        if (variantFile.Exists && variantFile.LastWriteTime > file.LastWriteTime)
            return new HttpResult(variantFile);

        await using var stream = file.OpenRead();
        using var originalBitmap = SKBitmap.Decode(stream);

        // Calculate dimensions maintaining aspect ratio
        var originalWidth = originalBitmap.Width;
        var originalHeight = originalBitmap.Height;

        int targetWidth, targetHeight;
        if (width != null && height != null)
        {
            targetWidth = width.Value;
            targetHeight = height.Value;
        }
        else if (width != null)
        {
            targetWidth = width.Value;
            targetHeight = (int)(originalHeight * ((double)width.Value / originalWidth));
        }
        else // height != null
        {
            targetHeight = height!.Value;
            targetWidth = (int)(originalWidth * ((double)height.Value / originalHeight));
        }

        // Create resized bitmap
        using var resizedBitmap = originalBitmap.Resize(new SKImageInfo(targetWidth, targetHeight), SKSamplingOptions.Default);
        using var image = SKImage.FromBitmap(resizedBitmap);
        using var data = image.Encode(SKEncodedImageFormat.Webp, 90);

        await using var outputStream = File.Create(variantPath);
        data.SaveTo(outputStream);
        return new HttpResult(new FileInfo(variantPath));
    }
}
