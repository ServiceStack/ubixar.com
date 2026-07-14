using Microsoft.Extensions.Logging;
using MyApp.Data;
using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.Auth;
using ServiceStack.OrmLite;
using ServiceStack.Text;
using SkiaSharp;
using Thread = MyApp.ServiceModel.Thread;

namespace MyApp.ServiceInterface;

public class PublishServices(ILogger<PublishServices> log, AppData appData) : Service
{
    private async Task<User> AssertUser()
    {
        var user = await Db.SingleByIdAsync<User>(Request.GetRequiredUserId());
        return user ?? throw HttpError.NotFound("User not found");
    }

    public async Task<PublishThreadResponse> Post(PublishThread request)
    {
        var thread = request.ConvertTo<PublishedThread>();
        thread.RemoteId = request.Id;
        thread.RemoteIp = Request.UserHostAddress;
        thread.PublishedAt = DateTime.UtcNow;
        thread.PublishedBy = Request.GetRequiredUserId();
        thread.Id = 0; // AutoIncrement

        log.LogDebug("Publishing thread {ThreadId} from {RemoteIp} by {UserId}", 
            request.Id, thread.RemoteIp, thread.PublishedBy);

        var messagesJson = ClientConfig.ToJson(thread.Messages);
        thread.MessagesHash = messagesJson.ToSha256Hash();
        thread.ExternalRef = PreciseTimestamp.UniqueTimestamp.EncodeBase64Url();
        thread.PublishedUrl = Request.ResolveAbsoluteUrl($"~/t/{thread.ExternalRef}");

        var existingThread = await Db.SingleAsync<PublishedThread>(t =>
            t.MessagesHash == thread.MessagesHash || t.ExternalRef == thread.ExternalRef);
        if (existingThread != null)
        {
            log.LogInformation("Thread already exists {Conflict}",
                existingThread.ExternalRef == thread.ExternalRef
                    ? $" (ref: {existingThread.ExternalRef})"
                    : existingThread.MessagesHash == thread.MessagesHash
                        ? $" (hash: {existingThread.MessagesHash})"
                        : "");

            if (existingThread.PublishedBy != thread.PublishedBy)
                throw new Exception("Thread already exists but was published by a different user");
            
            thread.ExternalRef = existingThread.ExternalRef;
            thread.PublishedUrl = existingThread.PublishedUrl;
            thread.PublicThreadId = existingThread.PublicThreadId;
            await Db.DeleteAsync<PublishedThread>(t => t.ExternalRef == existingThread.ExternalRef);
        }

        thread.Id = (int) await Db.InsertAsync(thread, selectIdentity: true);
        await CreateThreadForPublishedThread(thread);

        return new PublishThreadResponse
        {
            PublishedUrl = thread.PublishedUrl,
        };
    }

    private async Task<string> GetViewerHtml(string page)
    {
        var viewerHtml = await VirtualFileSources.GetFile("llms/index.html").ReadAllTextAsync();
        var baseHref = $"<base href=\"{Request.ResolveAbsoluteUrl("~/llms/")}\">";
        viewerHtml = viewerHtml.Replace("<base />", baseHref, StringComparison.OrdinalIgnoreCase);
        viewerHtml = viewerHtml.Replace("/*App*/", $"/*include: {page}*/");
        
        // Handle simple server side includes like /*include: filename.ext*/
        viewerHtml = System.Text.RegularExpressions.Regex.Replace(viewerHtml, @"/\*include:\s*([^*\s]+)\*/", match =>
        {
            var filename = match.Groups[1].Value.Trim();
            if (filename.Contains("..") || filename.StartsWith('/') || filename.StartsWith('\\'))
                return match.Value;

            var includePath = VirtualFileSources.GetFile($"llms/{filename}");
            if (includePath == null)
                return match.Value;

            try
            {
                return includePath.ReadAllText();
            }
            catch
            {
                return match.Value;
            }
        });

        viewerHtml = viewerHtml.Replace("<script type=\"importmap\"></script>", 
            """
            <script type="importmap">
            {
                "imports": {
                    "vue-prod": "/lib/mjs/vue.min.mjs",
                    "vue": "/lib/mjs/vue.mjs",
                    "vue-router": "/lib/mjs/vue-router.min.mjs",
                    "@servicestack/client": "/lib/mjs/servicestack-client.mjs",
                    "@servicestack/vue": "/lib/mjs/servicestack-vue.mjs",
                    "marked": "/lib/mjs/marked.min.mjs",
                    "highlight.js": "/lib/mjs/highlight.min.mjs",
                    "chart.js": "/lib/mjs/chart.js",
                    "color.js": "/lib/mjs/color.js",
                    "katex": "/llms/katex/katex.min.mjs"
                }
            }
            </script>
            """);
        return viewerHtml;
    }
    
    AuthenticateResponse? GetAuthUser()
    {
        var user = Request.GetClaimsPrincipal();
        if (!user.IsAuthenticated())
            return null;

        return new AuthenticateResponse
        {
            UserId = user.GetUserId(),
            UserName = user.GetUserName(),
            DisplayName = user.GetDisplayName(),
            ProfileUrl = user.GetPicture(),
            Roles = user.GetRoles().ToList(),
        };
    }
    
    public async Task<object> Get(ViewPublishedThread request)
    {
        var page = "thread.mjs";
        
        var viewerHtml = await GetViewerHtml(page);

        try
        {
            var thread = await Db.SingleAsync<PublishedThread>(t => t.ExternalRef == request.ExternalRef);
            if (thread == null)
                throw new Exception("Thread not found");
            
            var profile = (thread.Metadata?.TryGetValue("profile", out var profileValue) == true
                ? profileValue
                : null) ?? "default";

            var userId = thread.PublishedBy;
            viewerHtml = viewerHtml.Replace(
                "<script id=\"data\"></script>",
                $"""
                 <script id="data">
                 window.STATE.user = {GetAuthUser().ToJson() ?? "null"};
                 window.ARGS.currentThread = {thread.ToJson()};
                 window.ARGS.thread = {(await CreateThreadForPublishedThread(thread)).ToJson()};
                 window.STATE.userAvatar = '/publish/avatar/{userId}/user';
                 window.STATE.agentAvatar = '/publish/avatar/{userId}/{profile}';
                 </script>
                 """);
        }
        catch (Exception e)
        {
            var error = new ResponseStatus
            {
                ErrorCode = e.GetType().Name,
                Message = e.Message,
                StackTrace = e.StackTrace,
            };
            viewerHtml = viewerHtml.Replace(
                "<script id=\"data\"></script>",
                $"<script id=\"data\">window.ARGS.error = {error.ToJson()};</script>");
        }
        
        return viewerHtml;
    }

    public async Task<object> Get(ViewPublishedMedia request)
    {
        var page = "media.mjs";
        
        var viewerHtml = await GetViewerHtml(page);

        try
        {
            var media = await Db.SingleAsync<PublishedMedia>(t => t.ExternalRef == request.ExternalRef);
            if (media == null)
                throw new Exception("Media not found");
            
            viewerHtml = viewerHtml.Replace(
                "<script id=\"data\"></script>",
                $"""
                 <script id="data">
                 window.STATE.user = {GetAuthUser().ToJson() ?? "null"};
                 window.ARGS.media = {media.ToJson()};
                 window.ARGS.thread = {(await CreateThreadForPublishedMedia(media)).ToJson()};
                 </script>
                 """);
        }
        catch (Exception e)
        {
            var error = new ResponseStatus
            {
                ErrorCode = e.GetType().Name,
                Message = e.Message,
                StackTrace = e.StackTrace,
            };
            viewerHtml = viewerHtml.Replace(
                "<script id=\"data\"></script>",
                $"<script id=\"data\">window.ARGS.error = {error.ToJson()};</script>");
        }
        
        return viewerHtml;
    }
    
    public async Task<PublishAvatarResponse> Post(PublishAvatar request)
    {
        log.LogDebug("Publishing {Profile} avatar for user {UserId} from {RemoteIp}", 
            request.Profile, Request.GetRequiredUserId(), Request.UserHostAddress);

        var user = await AssertUser();

        var file = Request.Files.FirstOrDefault();
        if (file == null)
            throw HttpError.BadRequest("No file uploaded");

        foreach (var uploadedFile in Request.Files)
        {
            appData.AssertMaxUpload(uploadedFile.ContentLength, log);
        }
        
        var tmpFile = Path.GetTempFileName();
        try
        {
            log.LogDebug("Saving uploaded avatar to temporary file {TmpFile}", tmpFile);
            await file.SaveToAsync(tmpFile);
            var origFileSize = new FileInfo(tmpFile).Length;
            
            await using var fileStream = File.OpenRead(tmpFile);
        
            using var originalBitmap = SKBitmap.Decode(fileStream);
            if (originalBitmap == null)
                throw HttpError.BadRequest("Could not decode image");
            
            log.LogDebug("Decoded uploaded avatar ({FileSize}) to bitmap", ((int)new FileInfo(tmpFile).Length).HumanifyNumber());
            var webpImage = originalBitmap.Encode(SKEncodedImageFormat.Webp, 90);
            if (webpImage == null)
                throw HttpError.BadRequest("Could not encode image as WEBP");

            var origHash = webpImage.ToSha256Hash();
            var filePath = appData.GetCachePath(origHash + ".webp");
            await webpImage.SaveToAsync(filePath);
            
            var webpFileSize = new FileInfo(filePath).Length;
            log.LogDebug("Saved avatar as WEBP ({FileSize}) to {FilePath} (orig: {OrigFileSize})", 
                webpFileSize.HumanifyNumber(), filePath, origFileSize.HumanifyNumber());
        
            // load image and resize to 256x256
            using var resizedImage = originalBitmap.ResizeBitmapAsAvif(256, 256);
            var variantPath = filePath.WithoutExtension() + "_256w.webp";
            var variantFileName = Path.GetFileName(variantPath);
            await using var outputStream = File.Create(variantPath);
            resizedImage.SaveTo(outputStream);
        
            user.AddAvatar(request.Profile, variantFileName);

            var profileUrl = user.ProfileUrl;
            if (user.ProfileUrl?.StartsWith("data:image/svg+xml,") == true && request.Profile == "user")
            {
                // replace default SVG profile avatar with the new published avatar
                var relativePath = $"/avatars/{user.UserName[..2]}/{user.UserName}.webp";
                var avatarPath = appData.Config.AppDataPath.CombineWith(relativePath);
                Path.GetDirectoryName(avatarPath).AssertDir();
                try { File.Delete(avatarPath); } catch { }
                await using var avatarFileStream = File.OpenWrite(avatarPath);
                resizedImage.SaveTo(avatarFileStream);
                profileUrl = relativePath + "?v=" + PreciseTimestamp.UniqueTimestamp;
                
                await Db.UpdateOnlyAsync(() => new ApplicationUser { ProfileUrl = profileUrl }, 
                    u => u.Id == user.Id);
            }
            
            await Db.UpdateOnlyAsync(() => new User
            {
                Prefs = user.Prefs,
                ProfileUrl = profileUrl,
            }, u => u.Id == user.Id);
        
            return new PublishAvatarResponse
            {
                PublishedUrl = Request.ResolveAbsoluteUrl($"~/cache/{variantFileName}")
            };
        }
        finally
        {
            try { File.Delete(tmpFile); } catch { }
        }
    }

    public async Task<object> Get(GetPublishedAvatar request)
    {
        var user = await Db.SingleAsync<User>(u => u.Id == request.User);
        if (user == null)
            throw HttpError.NotFound($"User not found: {request.User}");

        var profileFileName = user.GetAvatar(request.Profile);
        if (profileFileName != null)
        {
            var profileFilePath = Path.Combine(appData.Config.CachePath, profileFileName[..2], profileFileName);
            if (File.Exists(profileFilePath))
            {
                return new HttpResult(new FileInfo(profileFilePath), $"image/{profileFilePath.LastRightPart('.')}");
            }
            else
            {
                log.LogWarning("Avatar file not found for user {UserId} profile {Profile}: {FilePath}", 
                    user.Id, request.Profile, profileFilePath);
                user.Prefs.Avatars?.Remove(request.Profile);
                await Db.UpdateOnlyAsync(() => new User { Prefs = user.Prefs }, u => u.Id == user.Id);
            }
        }

        if (request.Profile == "user")
        {
            if (user.ProfileUrl != null)
            {
                if (user.ProfileUrl.StartsWith("/avatars/"))
                {
                    var avatarPath = appData.WebRootPath.CombineWith(user.ProfileUrl.TrimStart('/'));
                    if (File.Exists(avatarPath))
                        return new HttpResult(new FileInfo(avatarPath), $"image/{avatarPath.LastRightPart('.')}");
                }
                if (user.ProfileUrl.StartsWith("data:image/svg+xml,"))
                {
                    var svgEncoded = user.ProfileUrl.Substring("data:image/svg+xml,".Length);
                    var svgBytes = System.Text.Encoding.UTF8.GetBytes(Uri.UnescapeDataString(svgEncoded));
                    return new HttpResult(new MemoryStream(svgBytes), MimeTypes.ImageSvg);
                }
            }
            return new HttpResult(new FileInfo(appData.WebRootPath.CombineWith("img", "profiles", "user1.svg")), MimeTypes.ImageSvg);
        }
        return new HttpResult(new FileInfo(appData.WebRootPath.CombineWith("img", "profiles", "user2.svg")), MimeTypes.ImageSvg);
    }
    
    public object Any(GetCacheFile request)
    {
        var filePath = appData.GetCachePath(request.Path);
        if (!File.Exists(filePath))
            throw HttpError.NotFound($"File not found: {filePath}");

        return new HttpResult(new FileInfo(filePath),
            asAttachment:request.Download == true);
    }

    public async Task<object> Post(PublishToCache request)
    {
        var to = new PublishToCacheResponse { PublishedUrls = new() };
        await AssertUser();

        foreach (var file in Request.Files)
        {
            appData.AssertMaxUpload(file.ContentLength, log);

            const string infoExt = ".info.json";
            if (file.FileName.EndsWith(infoExt))
            {
                var hash = file.FileName[..^10]; // Remove ".info.json" suffix
                if (hash.Length < 2) continue;

                var infoPath = appData.GetCachePath(hash + infoExt);
                var hashDir = Path.GetDirectoryName(infoPath)!;

                var hasAssociatedFile = Directory.Exists(hashDir) &&
                    Directory.EnumerateFiles(hashDir, hash + ".*")
                        .Any(f => !f.EndsWith(".info", StringComparison.OrdinalIgnoreCase));

                log.LogDebug("Publishing .info file {FileName} ({FileSize}) to cache. Associated file exists: {HasAssociatedFile}", 
                    file.FileName, file.ContentLength, hasAssociatedFile);

                if (!hasAssociatedFile)
                    continue;

                await using var inputStream = await file.InputStream.CopyToNewMemoryStreamAsync();
                await using var outputStream = File.Create(infoPath);
                await inputStream.CopyToAsync(outputStream);
                
                // Save to PublishedMedia table
                inputStream.Position = 0;
                var infoJson = await inputStream.ReadToEndAsync();
                var mediaObj = (Dictionary<string,object>) JSON.parse(infoJson);
                var media = mediaObj.FromObjectDictionary<PublishedMedia>();
                media.Hash = hash;
                media.RemoteId = media.Id;
                media.RemoteIp = Request.UserHostAddress;
                media.PublishedAt = DateTime.UtcNow;
                media.PublishedBy = Request.GetRequiredUserId();
                media.ExternalRef = PreciseTimestamp.UniqueTimestamp.EncodeBase64Url();
                media.PublishedUrl = Request.ResolveAbsoluteUrl($"~/m/{media.ExternalRef}");
                media.Id = 0; // AutoIncrement
                
                var existingMedia = await Db.SingleAsync<PublishedMedia>(x => x.Hash == hash);
                if (existingMedia != null)
                {
                    log.LogInformation("Media already exists {Conflict}", hash);

                    if (existingMedia.PublishedBy != media.PublishedBy)
                        throw new Exception("Media already exists but was published by a different user");
            
                    media.ExternalRef = existingMedia.ExternalRef;
                    media.PublishedUrl = existingMedia.PublishedUrl;
                    media.PublicThreadId = existingMedia.PublicThreadId;
                    await Db.DeleteAsync<PublishedMedia>(x => x.Hash == hash);
                }
                await Db.InsertAsync(media);

                to.PublishedUrls[file.FileName] = Request.ResolveAbsoluteUrl($"~/cache/{hash}{infoExt}");
            }
            else
            {
                var fileName = await appData.SaveToCacheAsync(file);
                log.LogDebug("Publishing file {FileName} to cache ({FileSize})", file.FileName, file.ContentLength);
                to.PublishedUrls[file.FileName] = Request.ResolveAbsoluteUrl($"~/cache/{fileName}");
            }
        }

        return to;
    }

    System.Text.RegularExpressions.Regex TrimNumbersRegex = new(@"\d+$", System.Text.RegularExpressions.RegexOptions.Compiled);
    private static string[] ImageExts = ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "tif", "avif", "webp", "svg"];
    private static HashSet<string> ImageExtSet = new(ImageExts, StringComparer.OrdinalIgnoreCase);
    bool IsImage(string ext) => ImageExtSet.Contains(ext.TrimStart('.'));

    public async Task<object> Post(PublishMedia request)
    {
        var user = await AssertUser();

        log.LogDebug("Publishing media from {RemoteIp} by {UserName}",
            Request.UserHostAddress, user.UserName);

        var infoFile = Request.Files.FirstOrDefault(f => f.FileName == "info.json");
        if (infoFile == null)
            throw HttpError.BadRequest("Missing info.json file");
        
        if (Request.Files.Length != 2)
            throw HttpError.BadRequest("No media file uploaded");

        foreach (var uploadedFile in Request.Files)
        {
            appData.AssertMaxUpload(uploadedFile.ContentLength, log);
        }

        await using var infoStream = infoFile.InputStream;
        var infoJson = await infoStream.ReadToEndAsync();
        var mediaObj = (Dictionary<string,object>) JSON.parse(infoJson);
        var publishedMedia = mediaObj.FromObjectDictionary<PublishedMedia>();
        publishedMedia.RemoteIp = Request.UserHostAddress;
        publishedMedia.PublishedAt = DateTime.UtcNow;
        publishedMedia.PublishedBy = user.Id;
        publishedMedia.Id = 0; // AutoIncrement
        
        // save media file to cache (converting non-WebP images to WebP)
        var mediaFile = Request.Files.FirstOrDefault(f => f.FileName != "info.json");
        if (mediaFile == null)
            throw HttpError.BadRequest("Missing media file");

        var ext = mediaFile.FileName.WithoutExtension().ToLowerInvariant();
        var isImage = mediaFile.ContentType?.StartsWith("image/") == true
            || IsImage(ext);
        string mediaFileName;

        if (isImage && ext != "webp")
        {
            await using var imageStream = mediaFile.InputStream;
            using var bitmap = SKBitmap.Decode(imageStream);
            if (bitmap == null)
                throw HttpError.BadRequest("Could not decode image");

            using var webpData = bitmap.Encode(SKEncodedImageFormat.Webp, 90);
            if (webpData == null)
                throw HttpError.BadRequest("Could not encode image as WebP");

            var webpHash = webpData.ToSha256Hash();
            mediaFileName = webpHash + ".webp";
            publishedMedia.Hash = webpHash;

            var webpFilePath = appData.GetCachePath(mediaFileName);
            if (!File.Exists(webpFilePath))
            {
                await webpData.SaveToAsync(webpFilePath);
            }

            log.LogDebug("Converted {OrigExt} to WebP ({FileSize}) as {FileName}",
                ext, new FileInfo(webpFilePath).Length, mediaFileName);
        }
        else
        {
            mediaFileName = await appData.SaveToCacheAsync(mediaFile);
            publishedMedia.Hash = mediaFileName.WithoutExtension();
        }

        var hasExt = publishedMedia.Name.IndexOf('.') >= 0 && publishedMedia.Name.LastRightPart('.').Length <= 4;
        if (hasExt)
        {
            publishedMedia.Name = publishedMedia.Name.LastLeftPart('.').Replace('-', ' ');
            // trim any numbers at the end of the name (e.g., "image-123" -> "image")
            publishedMedia.Name = TrimNumbersRegex.Replace(publishedMedia.Name, "");
            publishedMedia.Name = publishedMedia.Name.Trim();
        }
        
        publishedMedia.Url = "/cache/" + mediaFileName;

        // Preserve ExternalRef/PublishedUrl from existing entry if present
        var existing = await Db.SingleAsync<PublishedMedia>(p => p.Hash == publishedMedia.Hash);
        if (existing != null)
        {
            publishedMedia.ExternalRef = existing.ExternalRef;
            publishedMedia.PublishedUrl = existing.PublishedUrl;
            await Db.DeleteAsync<PublishedMedia>(p => p.Hash == publishedMedia.Hash);
        }
        else
        {
            publishedMedia.ExternalRef = PreciseTimestamp.UniqueTimestamp.EncodeBase64Url();
            publishedMedia.PublishedUrl = Request.ResolveAbsoluteUrl($"~/m/{publishedMedia.ExternalRef}");
        }

        publishedMedia.Id = (int) await Db.InsertAsync(publishedMedia, selectIdentity: true);
        var thread = await CreateThreadForPublishedMedia(publishedMedia);
        
        log.LogDebug("Published media {MediaFileName} to cache", mediaFileName);

        return new PublishMediaResponse
        {
            PublishedUrl = publishedMedia.PublishedUrl,
        };
    }
    
    public async Task<object> Post(PublishProject request)
    {
        var user = await AssertUser();

        log.LogDebug("Publishing project {Project} from {RemoteIp} by {UserName}",
            request.Name, Request.UserHostAddress, user.UserName);

        var infoFile = Request.Files.FirstOrDefault(f => f.FileName.EndsWith(".json", StringComparison.OrdinalIgnoreCase));
        var tarFile = Request.Files.FirstOrDefault(f => f.FileName.EndsWith(".tar.gz", StringComparison.OrdinalIgnoreCase));

        if (infoFile == null)
            throw HttpError.BadRequest("Missing info.json file");
        if (tarFile == null)
            throw HttpError.BadRequest("Missing .tar.gz file");

        var projectName = request.Name.ToSafeSlug();

        // Deserialize info.json into PublishedProject
        await using var infoStream = infoFile.InputStream;
        var infoJson = await infoStream.ReadToEndAsync();
        var project = (Dictionary<string,object>) JSON.parse(infoJson);
        var publishedProject = project.FromObjectDictionary<PublishedProject>();
        publishedProject.Name = request.Name;
        publishedProject.RemoteIp = Request.UserHostAddress;
        publishedProject.PublishedAt = DateTime.UtcNow;
        publishedProject.PublishedBy = user.Id;
        publishedProject.Id = 0; // AutoIncrement

        // Preserve ExternalRef/PublishedUrl from existing entry if present
        var existing = await Db.SingleAsync<PublishedProject>(p =>
            p.Name == request.Name && p.PublishedBy == user.Id);
        if (existing != null)
        {
            publishedProject.ExternalRef = existing.ExternalRef;
            publishedProject.PublishedUrl = existing.PublishedUrl;
            publishedProject.PublicThreadId = existing.PublicThreadId;
            await Db.DeleteAsync<PublishedProject>(p => p.Id == existing.Id);
        }
        else
        {
            publishedProject.ExternalRef = PreciseTimestamp.UniqueTimestamp.EncodeBase64Url();
            publishedProject.PublishedUrl = Request.ResolveAbsoluteUrl($"~/p/{user.UserName}/{projectName}");
        }

        // Extract tar.gz to temp directory
        var tmpDir = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
        Directory.CreateDirectory(tmpDir);
        try
        {
            var tmpTar = Path.GetTempFileName();
            try
            {
                await tarFile.SaveToAsync(tmpTar);
                using var proc = new System.Diagnostics.Process
                {
                    StartInfo = new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = "tar",
                        ArgumentList = { "-xzf", tmpTar, "-C", tmpDir },
                        RedirectStandardError = true,
                        UseShellExecute = false,
                    }
                };
                proc.Start();
                var stderr = await proc.StandardError.ReadToEndAsync();
                await proc.WaitForExitAsync();

                if (proc.ExitCode != 0)
                    throw HttpError.BadRequest($"Failed to extract tar.gz: {stderr}");
            }
            finally
            {
                try { File.Delete(tmpTar); } catch { }
            }

            // Move extracted directory to projects path
            var projectsPath = appData.Config.ProjectsPath;
            var destDir = Path.Combine(projectsPath, user.UserName, projectName);

            DeleteDirectory(destDir);

            Directory.CreateDirectory(Path.GetDirectoryName(destDir)!);
            MoveDirectory(tmpDir, destDir);

            DeleteDirectory(tmpDir);

            log.LogInformation("Published project {Project} to {DestDir}", projectName, destDir);
        }
        catch
        {
            DeleteDirectory(tmpDir);
            throw;
        }

        publishedProject.Id = (int) await Db.InsertAsync(publishedProject, selectIdentity: true);
        await CreateThreadForPublishedProject(publishedProject);

        return new PublishProjectResponse
        {
            PublishedUrl = publishedProject.PublishedUrl,
        };
    }

    public static void MoveDirectory(string sourceDir, string destDir)
    {
        try
        {
            Directory.Move(sourceDir, destDir);
        }
        catch (IOException)
        {
            // Likely cross-device (EXDEV) — fall back to copy + delete
            CopyDirectory(sourceDir, destDir);
            DeleteDirectory(sourceDir);
        }
    }

    public static void CopyDirectory(string sourceDir, string destDir)
    {
        Directory.CreateDirectory(destDir);

        foreach (var file in Directory.EnumerateFiles(sourceDir))
        {
            var destFile = Path.Combine(destDir, Path.GetFileName(file));
            File.Copy(file, destFile, overwrite: true);
        }

        foreach (var subDir in Directory.EnumerateDirectories(sourceDir))
        {
            CopyDirectory(subDir, Path.Combine(destDir, Path.GetFileName(subDir)));
        }
    }
    
    public static void DeleteDirectory(string dir)
    {
        try
        {
            if (Directory.Exists(dir))
                Directory.Delete(dir, recursive: true);
        }
        catch (Exception e)
        {
            Console.WriteLine($"Failed to delete directory {dir}: {e.Message}");
        }
    }

    public async Task<object> Get(GetPublishedProjectFile request)
    {
        var projectDir = Path.Combine(appData.Config.ProjectsPath, request.UserName, request.ProjectName);
        if (!Directory.Exists(projectDir))
            throw HttpError.NotFound("Project not found");

        var relativePath = string.IsNullOrEmpty(request.Path) ? "index.html" : request.Path;
        var filePath = Path.GetFullPath(Path.Combine(projectDir, relativePath));

        // Prevent path traversal outside project directory
        if (!filePath.StartsWith(Path.GetFullPath(projectDir) + Path.DirectorySeparatorChar) &&
            filePath != Path.GetFullPath(projectDir))
            throw HttpError.Forbidden("Invalid path");

        if (!File.Exists(filePath))
            throw HttpError.NotFound("File not found");

        if (!Request.QueryString.HasKey("original") && relativePath.TrimStart('/').Equals("index.html", StringComparison.OrdinalIgnoreCase))
        {
            var contents = await File.ReadAllTextAsync(filePath);
            // inject <base href="..."> into <head> if not present
            if (!contents.Contains("<base", StringComparison.OrdinalIgnoreCase))
            {
                var baseHref = $"<base href=\"{Request.ResolveAbsoluteUrl($"~/p/{request.UserName}/{request.ProjectName}")}/\">";
                contents = contents.Replace("<head>", $"<head>\n    {baseHref}", StringComparison.OrdinalIgnoreCase);
                // Also remove leading '/' from relative paths in the HTML content
                contents = contents.Replace("src=\"/", "src=\"", StringComparison.OrdinalIgnoreCase);
                contents = contents.Replace("href=\"/", "href=\"", StringComparison.OrdinalIgnoreCase);
                return new HttpResult(contents, MimeTypes.Html);
            }
        }
        
        var mimeType = MimeTypes.GetMimeType(filePath);
        return new HttpResult(new FileInfo(filePath), mimeType);
    }

    private async Task<Thread> CreateThreadForPublishedMedia(PublishedMedia publishedMedia)
    {
        if (publishedMedia.PublicThreadId != null)
            return await Db.SingleByIdAsync<Thread>(publishedMedia.PublicThreadId.Value);
        var thread = new Thread
        {
            Url = publishedMedia.PublishedUrl,
            Description = publishedMedia.Name,
            RefId = publishedMedia.Id,
        }.WithAudit(by:Request.GetRequiredUserId());
        thread.Id = (int) await Db.InsertAsync(thread, selectIdentity: true);
            
        await Db.UpdateOnlyAsync(() => new PublishedMedia { PublicThreadId = thread.Id }, 
            where: x => x.Id == publishedMedia.Id);
        return thread;
    }

    private async Task<Thread> CreateThreadForPublishedThread(PublishedThread publishedThread)
    {
        if (publishedThread.PublicThreadId != null)
            return await Db.SingleByIdAsync<Thread>(publishedThread.PublicThreadId.Value);
        var thread = new Thread
        {
            Url = publishedThread.PublishedUrl,
            Description = publishedThread.Title,
            RefId = publishedThread.Id,
        }.WithAudit(by:Request.GetRequiredUserId());
        thread.Id = (int) await Db.InsertAsync(thread, selectIdentity: true);
            
        await Db.UpdateOnlyAsync(() => new PublishedThread { PublicThreadId = thread.Id }, 
            where: x => x.Id == publishedThread.Id);
        return thread;
    }

    private async Task<Thread> CreateThreadForPublishedProject(PublishedProject publishedProject)
    {
        if (publishedProject.PublicThreadId != null)
            return await Db.SingleByIdAsync<Thread>(publishedProject.PublicThreadId.Value);
        var thread = new Thread
        {
            Url = publishedProject.PublishedUrl,
            Description = publishedProject.Name,
            RefId = publishedProject.Id,
        }.WithAudit(by:Request.GetRequiredUserId());
        thread.Id = (int) await Db.InsertAsync(thread, selectIdentity: true);
            
        await Db.UpdateOnlyAsync(() => new PublishedProject { PublicThreadId = thread.Id }, 
            where: x => x.Id == publishedProject.Id);
        return thread;
    }

    /*
    [Tag(Tags.Publish)]
    public class CreateThreadForPublished : IPost, IReturn<CreateThreadForPublishedResponse>
    {
        public int Id { get; set; }
        public PublishType Type { get; set; }
    }
    public class CreateThreadForPublishedResponse
    {
        public Thread Result { get; set; }
        public ResponseStatus? ResponseStatus { get; set; }
    }    
    public async Task<CreateThreadForPublishedResponse> Post(CreateThreadForPublished request)
    {
        if (request.Type == PublishType.Media)
        {
            var media = await Db.SingleAsync<PublishedMedia>(m => m.Id == request.Id);
            if (media == null)
                throw HttpError.NotFound("Media not found");

            var thread = await CreateThreadForPublishedMedia(media);
            return new CreateThreadForPublishedResponse
            {
                Result = thread,
            };
        }
        if (request.Type == PublishType.Thread)
        {
            var publishedThread = await Db.SingleAsync<PublishedThread>(t => t.Id == request.Id);
            if (publishedThread == null)
                throw HttpError.NotFound("Published thread not found");

            var thread = await CreateThreadForPublishedThread(publishedThread);

            return new CreateThreadForPublishedResponse
            {
                Result = thread,
            };
        }
        if (request.Type == PublishType.Project)
        {
            var publishedProject = await Db.SingleAsync<PublishedProject>(p => p.Id == request.Id);
            if (publishedProject == null)
                throw HttpError.NotFound("Published project not found");

            var thread = await CreateThreadForPublishedProject(publishedProject);

            return new CreateThreadForPublishedResponse
            {
                Result = thread,
            };
        }

        throw new NotSupportedException($"CreateThreadForPublished is not supported for type {request.Type}");
    }
    */
    
}