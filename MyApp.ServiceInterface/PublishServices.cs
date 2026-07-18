using Microsoft.Extensions.Logging;
using MyApp.Data;
using MyApp.ServiceInterface.Commands;
using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.Auth;
using ServiceStack.OrmLite;
using ServiceStack.Text;
using SkiaSharp;
using Thread = MyApp.ServiceModel.Thread;

namespace MyApp.ServiceInterface;

public class PublishServices(
    ILogger<PublishServices> log, 
    AppData appData, 
    AgentEventsManager agentManager,
    IAutoQueryDb autoQuery) : Service
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
    
    UserInfo? GetAuthUser()
    {
        var user = Request.GetClaimsPrincipal();
        if (!user.IsAuthenticated())
            return null;

        return new UserInfo
        {
            UserId = user.GetUserId(),
            UserName = user.GetUserName(),
            DisplayName = user.GetDisplayName(),
            ProfileUrl = user.GetPicture(),
            Roles = user.GetRoles().ToList(),
        };
    }
    
    public class UserInfo
    {
        public string UserId { get; set; }
        public string UserName { get; set; }
        public string? DisplayName { get; set; }
        public string? ProfileUrl { get; set; }
        public List<string> Roles { get; set; } 
        public List<Rating> Ratings { get; set; }
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

    public async Task<object> Get(ViewPublishedMedias request)
    {
        var page = "medias.mjs";
        
        var viewerHtml = await GetViewerHtml(page);

        try
        {
            var query = request.ConvertTo<QueryPublishedMedia>();
            query.Type = AssetType.Image;
            query.Take ??= 50;
            query.OrderByDesc ??= "Id";
            var queryResponse = await Get(query);
            
            viewerHtml = viewerHtml.Replace(
                "<script id=\"data\"></script>",
                $"""
                 <script id="data">
                 window.STATE.user = {GetAuthUser().ToJson() ?? "null"};
                 window.ARGS.results = {queryResponse.Results.ToJson()};
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
    
    public async Task<QueryResponse<MediaInfo>> Get(QueryPublishedMedia request)
    {
        // 'reactionsCount' isn't a PublishedMedia column: remove before CreateQuery and
        // order by the ReactionsCount of the media's public comment Thread instead
        string? orderByReactions = null;
        if (request.OrderBy?.TrimStart('-')?.ToLower() == "reactionscount")
        {
            orderByReactions = request.OrderBy;
            request.OrderBy = null;
        }

        using var db = autoQuery.GetDb(request, base.Request);
        var q = autoQuery.CreateQuery(request, base.Request, db);
        q.LeftJoin<Thread>((m,t) => m.PublicThreadId == t.Id);

        if (orderByReactions != null)
        {
            var dir = orderByReactions.StartsWith('-') ? "DESC" : "ASC";
            var reactionsCount = q.Column<Thread>(t => t.ReactionsCount, prefixTable: true);
            var mediaId = q.Column<PublishedMedia>(x => x.Id, prefixTable: true);
            // COALESCE so media without a public Thread sort as 0 reactions
            // (Postgres would otherwise put NULLs first on DESC)
            q.UnsafeOrderBy($"COALESCE({reactionsCount}, 0) {dir}, {mediaId} DESC");
        }

        var userId = Request.GetUserId();
        var userCache = userId != null 
            ? appData.GetUserCacheById(Db, userId) 
            : null;
        var ratings = userCache?.Ratings ?? [];
        if (ratings.Count == 0)
        {
            ratings.Add(Rating.PG);
            ratings.Add(Rating.PG13);
            ratings.Add(Rating.M);
        }
        q.Where(x => ratings.Contains(x.Rating!.Value) || x.Type != AssetType.Image);
        
        if (request.Category != null)
        {
            var category = appData.GetCategory(request.Category);
            if (category != null)
            {
                var catColumn = q.Column<PublishedMedia>(x => x.Categories);
                q.And(catColumn + " ? {0}", category.Name);
            }
            else
            {
                log.LogWarning("Unknown category {Category}", request.Category);
            }
        }
        if (request.Tag != null)
        {
            var tag = appData.GetTag(request.Tag);
            if (tag != null)
            {
                var tagColumn = q.Column<PublishedMedia>(x => x.Tags);
                q.And(tagColumn + " ? {0}", tag.Name);
            }
            else
            {
                log.LogWarning("Unknown tag {Tag}", request.Tag);
            }
        }

        if (request.User != null)
        {
            request.UserId = request.User == "me"
                ? Request.GetRequiredUserId()
                : request.User.Length == 36 && Guid.TryParse(request.User, out _)
                    ? request.User
                    : null;

            if (request.UserId != null)
            {
                q.Where(x => x.PublishedBy == request.UserId);
            }
            else
            {
                var cachedUser = appData.GetUserCacheByName(Db, request.User);
                if (cachedUser == null)
                {
                    log.LogWarning("Unknown user {User}", request.User);
                    return new QueryResponse<MediaInfo> { Results = [] };
                }
                q.Where(x => x.PublishedBy == cachedUser.Id);
            }
        }
        else if (request.UserId != null)
        {
            q.Where(x => x.PublishedBy == request.UserId);
        }
        
        return await autoQuery.ExecuteAsync(request, q, base.Request, db);
    }

    public async Task<object> Get(QueryPublishedProjects request)
    {
        // 'reactionsCount' isn't a PublishedMedia column: remove before CreateQuery and
        // order by the ReactionsCount of the media's public comment Thread instead
        string? orderByReactions = null;
        if (request.OrderBy?.TrimStart('-')?.ToLower() == "reactionscount")
        {
            orderByReactions = request.OrderBy;
            request.OrderBy = null;
        }

        using var db = autoQuery.GetDb(request, base.Request);
        var q = autoQuery.CreateQuery(request, base.Request, db);
        q.LeftJoin<Thread>((m,t) => m.PublicThreadId == t.Id);

        if (orderByReactions != null)
        {
            var dir = orderByReactions.StartsWith('-') ? "DESC" : "ASC";
            var reactionsCount = q.Column<Thread>(t => t.ReactionsCount, prefixTable: true);
            var projectId = q.Column<PublishedProject>(x => x.Id, prefixTable: true);
            // COALESCE so projects without a public Thread sort as 0 reactions
            // (Postgres would otherwise put NULLs first on DESC)
            q.UnsafeOrderBy($"COALESCE({reactionsCount}, 0) {dir}, {projectId} DESC");
        }

        if (request.User != null)
        {
            request.UserId = request.User == "me"
                ? Request.GetRequiredUserId()
                : request.User.Length == 36 && Guid.TryParse(request.User, out _)
                    ? request.User
                    : null;

            if (request.UserId != null)
            {
                q.Where(x => x.PublishedBy == request.UserId);
            }
            else
            {
                var cachedUser = appData.GetUserCacheByName(Db, request.User);
                if (cachedUser == null)
                {
                    log.LogWarning("Unknown user {User}", request.User);
                    return new QueryResponse<MediaInfo> { Results = [] };
                }
                q.Where(x => x.PublishedBy == cachedUser.Id);
            }
        }
        else if (request.UserId != null)
        {
            q.Where(x => x.PublishedBy == request.UserId);
        }
        
        return await autoQuery.ExecuteAsync(request, q, base.Request, db);
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

        var userId = Request.GetRequiredUserId();

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
                media.PublishedBy = userId;
                media.ExternalRef = PreciseTimestamp.UniqueTimestamp.EncodeBase64Url();
                media.PublishedUrl = Request.ResolveAbsoluteUrl($"~/m/{media.ExternalRef}");
                media.Id = 0; // AutoIncrement
                
                var existingMedia = await Db.SingleAsync<PublishedMedia>(x => x.Hash == hash);
                if (existingMedia != null)
                {
                    log.LogInformation("Media already exists {Conflict}", hash);

                    if (existingMedia.PublishedBy != media.PublishedBy)
                        throw new Exception("Media already exists but was published by a different user");
            
                    UpdateFromExistingMedia(media, existingMedia);
                    await Db.DeleteAsync<PublishedMedia>(x => x.Hash == hash);
                }

                media.Id = (int) await Db.InsertAsync(media, selectIdentity:true);
                agentManager.QueuePublishedMedia(media, userId);

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

    private static void UpdateFromExistingMedia(PublishedMedia media, PublishedMedia existingMedia)
    {
        media.ExternalRef = existingMedia.ExternalRef;
        media.PublishedUrl = existingMedia.PublishedUrl;
        media.PublicThreadId = existingMedia.PublicThreadId;
        media.Caption = existingMedia.Caption;
        media.Description = existingMedia.Description;
        media.Tags = existingMedia.Tags;
        media.Categories = existingMedia.Categories;
        media.Rating = existingMedia.Rating;
        media.Ratings = existingMedia.Ratings;
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
            UpdateFromExistingMedia(publishedMedia, existing);
            await Db.DeleteAsync<PublishedMedia>(p => p.Hash == publishedMedia.Hash);
        }
        else
        {
            publishedMedia.ExternalRef = PreciseTimestamp.UniqueTimestamp.EncodeBase64Url();
            publishedMedia.PublishedUrl = Request.ResolveAbsoluteUrl($"~/m/{publishedMedia.ExternalRef}");
        }

        publishedMedia.Id = (int) await Db.InsertAsync(publishedMedia, selectIdentity: true);
        var thread = await CreateThreadForPublishedMedia(publishedMedia);
        agentManager.QueuePublishedMedia(publishedMedia, user.Id);
        
        log.LogDebug("Published media {MediaFileName} to cache", mediaFileName);

        return new PublishMediaResponse
        {
            PublishedUrl = publishedMedia.PublishedUrl,
        };
    }

    public async Task<object> Post(QueueMissingPublishedMedia request)
    {
        var mediaMissingClassification = await Db.SelectAsync<PublishedMedia>(p =>
            (p.Tags == null || p.Caption == null || p.Description == null) && (p.Error == null));

        var count = mediaMissingClassification.Count;
        foreach (var media in mediaMissingClassification)
        {
            agentManager.QueuePublishedMedia(media, Request.GetRequiredUserId());
        }
        return new StringResponse { Result = $"Queued {count} missing published media." };
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
            publishedProject.PosterImage = existing.PosterImage;
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
            
            (publishedProject.FileCount, publishedProject.Size) = CountFiles(destDir);

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
    
    public static (long,long) CountFiles(string dirPath)
    {
        long fileCount = 0;
        long byteCount = 0;
        foreach (var file in Directory.EnumerateFiles(dirPath, "*", SearchOption.AllDirectories))
        {
            fileCount++;
            byteCount += new FileInfo(file).Length;
        }
        return (fileCount, byteCount);
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

    public async Task<object> Post(DeletePublishedProject request)
    {
        var user = await AssertUser();
        var to = new StringsResponse();

        var project = await Db.SingleAsync<PublishedProject>(p => p.ExternalRef == request.ExternalRef);
        if (project == null)
            throw HttpError.NotFound($"Project not found: {request.ExternalRef}");

        var projectDir = Path.Combine(appData.Config.ProjectsPath, user.UserName, project.Name);
        DeleteDirectory(projectDir);
        
        if (project.PosterImage != null)
        {
            var posterPath = appData.GetCachePath(project.PosterImage.LastRightPart('/'));
            if (File.Exists(posterPath))
            {
                File.Delete(posterPath);
                to.Results.Add(project.PosterImage);
            }
        }

        if (project.PublicThreadId != null)
        {
            await Db.DeleteAsync<Thread>(t => t.Id == project.PublicThreadId);
            to.Results.Add($"PublicThreadId: {project.PublicThreadId}");
        }

        await Db.DeleteAsync<PublishedProject>(p => p.Id == project.Id);
        to.Results.Add($"Id: {project.Id}");

        return to;
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

    private async Task<PublishedMedia> AssertPublishedMedia(string externalRef)
    {
        var media = await Db.SingleAsync<PublishedMedia>(x => x.ExternalRef == externalRef);
        if (media == null)
            throw HttpError.NotFound("Media not found");
        return media;
    }

    public async Task<object> Post(DeletePublishedMedia request)
    {
        var media = await AssertPublishedMedia(request.ExternalRef);

        var ret = new StringsResponse { Results = [media.PublishedUrl] };
        await Db.DeleteAsync<PublishedMedia>(x => x.Id == media.Id);
        if (media.PublicThreadId != null)
        {
            await Db.DeleteAsync<Thread>(x => x.Id == media.PublicThreadId);
        }

        if (media.Url.StartsWith("/cache/"))
        {
            var filePath = appData.GetCachePath(media.Url.LastRightPart('/'));
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
                ret.Results.Add(media.Url);
            }
        }
        
        return ret;
    }

    public async Task<object> Post(UpdatePublishedMedia request)
    {
        var media = await AssertPublishedMedia(request.ExternalRef);
        
        await Db.UpdateOnlyAsync(() => new PublishedMedia { Rating = request.Rating },
            where: x => x.Id == media.Id);

        return new EmptyResponse();
    }
    
    public async Task<object> Post(UpdatePublishedProject request)
    {
        var project = await Db.SingleAsync<PublishedProject>(x => x.ExternalRef == request.ExternalRef);
        if (project == null)
            throw HttpError.NotFound("Project not found");

        // Only the project's publisher or an Admin can change its poster image
        if (project.PublishedBy != Request.GetUserId() && !Request.GetClaimsPrincipal().IsAdmin())
            throw HttpError.Forbidden("Only the project owner or an Admin can update this project");

        var file = Request.Files.FirstOrDefault();
        if (file == null)
            throw HttpError.BadRequest("No file uploaded");
        appData.AssertMaxUpload(file.ContentLength, log);

        string fileName;
        var tmpFile = Path.GetTempFileName();
        try
        {
            await file.SaveToAsync(tmpFile);
            await using var fileStream = File.OpenRead(tmpFile);

            using var bitmap = SKBitmap.Decode(fileStream);
            if (bitmap == null)
                throw HttpError.BadRequest("Could not decode image");

            using var webpImage = bitmap.Encode(SKEncodedImageFormat.Webp, 90);
            if (webpImage == null)
                throw HttpError.BadRequest("Could not encode image as WebP");

            // Save to the shared content-addressed cache so re-publishing the project doesn't remove it
            fileName = webpImage.ToSha256Hash() + ".webp";
            var filePath = appData.GetCachePath(fileName);
            if (!File.Exists(filePath))
                await webpImage.SaveToAsync(filePath);

            log.LogInformation("Saved project poster image ({FileSize}) to {FilePath}",
                new FileInfo(filePath).Length.HumanifyNumber(), filePath);
        }
        finally
        {
            try { File.Delete(tmpFile); } catch { }
        }

        // Content-addressed cache URL served by GetCacheFile (/cache/{**Path})
        var posterImage = Request.ResolveAbsoluteUrl($"~/cache/{fileName}");

        await Db.UpdateOnlyAsync(() => new PublishedProject { PosterImage = posterImage },
            where: x => x.Id == project.Id);

        return new EmptyResponse();
    }

    public async Task<object> Get(GetPublishProjectPosterImage request)
    {
        var project = await Db.SingleAsync<PublishedProject>(x => x.ExternalRef == request.ExternalRef);
        if (project == null)
            throw HttpError.NotFound("Project not found");

        if (!string.IsNullOrEmpty(project.PosterImage))
        {
            var posterPath = appData.GetCachePath(project.PosterImage.LastRightPart('/'));
            if (File.Exists(posterPath))
                return new HttpResult(new FileInfo(posterPath), "image/webp");
        }

        // No stored poster: return a generated 1024x1024 SVG poster featuring the project name
        return new HttpResult(BuildProjectPosterSvg(project.Name), "image/svg+xml");
    }

    // Generates a stylish, deterministic 1024x1024 SVG poster incorporating the project name
    private static string BuildProjectPosterSvg(string? name)
    {
        var title = string.IsNullOrWhiteSpace(name) ? "Untitled Project" : name.Trim();

        // Deterministic hue from the name so each project gets a stable, distinct palette
        var hash = 0;
        foreach (var c in title)
            hash = (hash * 31 + c) & 0x7fffffff;
        var hue = hash % 360;
        var hue2 = (hue + 40) % 360;
        var accentHue = (hue + 190) % 360;

        var lines = WrapText(title, maxChars: 16, maxLines: 4);
        var maxLen = 1;
        foreach (var l in lines)
            maxLen = Math.Max(maxLen, l.Length);

        double fontSize = Math.Clamp(980.0 / (maxLen * 0.62), 64, 150);
        var lineHeight = fontSize * 1.12;
        var blockHeight = lines.Count * lineHeight;

        const double centerY = 540;
        var firstBaseline = centerY - blockHeight / 2 + fontSize * 0.72;
        var lastBaseline = firstBaseline + (lines.Count - 1) * lineHeight;
        var eyebrowY = firstBaseline - fontSize * 0.72 - 46;
        var barY = lastBaseline + 48;
        var initialY = centerY + 300;
        var initial = char.ToUpper(title[0]).ToString();

        var tspans = new List<string>();
        for (var i = 0; i < lines.Count; i++)
        {
            var y = firstBaseline + i * lineHeight;
            tspans.Add($"<tspan x=\"512\" y=\"{y:0}\">{EscapeXml(lines[i])}</tspan>");
        }
        var titleTspans = string.Join("\n            ", tspans);

        const string fontFamily = "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

        return $"""
            <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-label="{EscapeXml(title)}">
              <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="hsl({hue},68%,46%)"/>
                  <stop offset="1" stop-color="hsl({hue2},72%,22%)"/>
                </linearGradient>
                <radialGradient id="glow" cx="50%" cy="30%" r="72%">
                  <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
                  <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
                </radialGradient>
                <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="60"/>
                </filter>
              </defs>

              <rect width="1024" height="1024" fill="url(#bg)"/>

              <g filter="url(#soft)">
                <circle cx="815" cy="210" r="210" fill="hsl({accentHue},85%,62%)" opacity="0.35"/>
                <circle cx="165" cy="885" r="260" fill="#000000" opacity="0.18"/>
                <circle cx="250" cy="170" r="120" fill="#ffffff" opacity="0.12"/>
              </g>

              <text x="512" y="{initialY:0}" text-anchor="middle" font-family="{fontFamily}" font-weight="800" font-size="820" fill="#ffffff" opacity="0.06">{EscapeXml(initial)}</text>

              <rect width="1024" height="1024" fill="url(#glow)"/>

              <text x="512" y="{eyebrowY:0}" text-anchor="middle" font-family="{fontFamily}" font-weight="700" font-size="34" letter-spacing="10" fill="#ffffff" opacity="0.72">PROJECT</text>

              <text text-anchor="middle" font-family="{fontFamily}" font-weight="800" font-size="{fontSize:0}" fill="#ffffff">
                {titleTspans}
              </text>

              <rect x="452" y="{barY:0}" width="120" height="8" rx="4" fill="#ffffff" opacity="0.85"/>
            </svg>
            """;
    }

    // Greedily word-wraps text to maxChars-wide lines, preferring breaks after '-'/'_'
    // (common in project slugs), hard-breaking overlong runs, and truncating with an
    // ellipsis once maxLines is reached.
    private static List<string> WrapText(string text, int maxChars, int maxLines)
    {
        // A token is a wrap-unit; SpaceBefore marks the start of a new space-separated word
        var tokens = new List<(string Text, bool SpaceBefore)>();
        var words = text.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        for (var wi = 0; wi < words.Length; wi++)
        {
            var pieces = SplitWord(words[wi], maxChars);
            for (var pi = 0; pi < pieces.Count; pi++)
                tokens.Add((pieces[pi], pi == 0 && wi > 0));
        }

        var lines = new List<string>();
        var current = "";
        foreach (var (t, spaceBefore) in tokens)
        {
            var candidate = current.Length == 0 ? t : current + (spaceBefore ? " " : "") + t;
            if (candidate.Length > maxChars && current.Length > 0)
            {
                lines.Add(current);
                current = t;
            }
            else
            {
                current = candidate;
            }
        }
        if (current.Length > 0)
            lines.Add(current);
        if (lines.Count == 0)
            lines.Add(text);

        if (lines.Count > maxLines)
        {
            lines = lines.Take(maxLines).ToList();
            var last = lines[maxLines - 1];
            if (last.Length > maxChars - 1)
                last = last[..(maxChars - 1)];
            lines[maxLines - 1] = last.TrimEnd() + "…";
        }
        return lines;
    }

    // Splits a word into wrap-pieces, breaking after each '-'/'_' (separator kept with the
    // left piece) and hard-breaking any remaining run longer than maxChars.
    private static List<string> SplitWord(string word, int maxChars)
    {
        var chunks = new List<string>();
        var start = 0;
        for (var i = 0; i < word.Length; i++)
        {
            if (word[i] is '-' or '_')
            {
                chunks.Add(word.Substring(start, i - start + 1));
                start = i + 1;
            }
        }
        if (start < word.Length)
            chunks.Add(word[start..]);
        if (chunks.Count == 0)
            chunks.Add(word);

        var result = new List<string>();
        foreach (var c in chunks)
        {
            var chunk = c;
            while (chunk.Length > maxChars)
            {
                result.Add(chunk[..maxChars]);
                chunk = chunk[maxChars..];
            }
            if (chunk.Length > 0)
                result.Add(chunk);
        }
        return result;
    }

    private static string EscapeXml(string s) => s
        .Replace("&", "&amp;")
        .Replace("<", "&lt;")
        .Replace(">", "&gt;")
        .Replace("\"", "&quot;")
        .Replace("'", "&apos;");
}