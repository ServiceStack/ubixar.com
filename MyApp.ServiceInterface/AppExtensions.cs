using System.Collections.Concurrent;
using System.Data;
using System.Net;
using System.Security.Claims;
using System.Text.Json;
using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.OrmLite;
using ServiceStack.Text;
using ServiceStack.Web;

namespace MyApp.ServiceInterface;

public static partial class AppExtensions
{
    /// <summary>
    /// Validates that a relative path is safe and doesn't traverse outside the intended directory.
    /// </summary>
    /// <param name="basePath">The base directory path.</param>
    /// <param name="relativePath">The relative path to validate.</param>
    /// <returns>True if the path is safe, false otherwise.</returns>
    public static bool IsPathSafe(this string relativePath, string basePath)
    {
        try
        {
            // Normalize paths to handle different directory separators
            basePath = Path.GetFullPath(basePath);
            
            // Combine the base path with the relative path
            string fullPath = Path.GetFullPath(Path.Combine(basePath, relativePath));
            
            // Check if the resulting path starts with the base path
            return fullPath.StartsWith(basePath, StringComparison.OrdinalIgnoreCase);
        }
        catch (Exception ex) when (ex is ArgumentException or NotSupportedException or PathTooLongException)
        {
            // Path contains invalid characters or is in an invalid format
            return false;
        }
    }
    
    public static string Plural(this string word, int count) => count == 1 ? word : word + "s";

    public static string? GetUserName(this IDictionary<string, UserCache> userCache, string? userId)
    {
        if (string.IsNullOrEmpty(userId))
            return null;
        return userCache.TryGetValue(userId, out var user) 
            ? user.UserName
            : "deleted";
    }

    public static UserCache? GetUserByName(this IDictionary<string, UserCache> userCache, string? userName)
    {
        if (string.IsNullOrEmpty(userName))
            return null;
        var user = userCache.Values.FirstOrDefault(x => x.UserName == userName);
        return user;
    }

    public static string? GenerateNotificationSummary(this string content, int startPos = 0) =>
        content.CleanBody(100);

    public static string? NotificationTitle(this string? content) => content.CleanBody(80);
    public static string? NotificationSummary(this string? content) => content.CleanBody(100);

    public static string? AchievementTitle(this string? content) => content.CleanBody(80);

    public static string? CleanBody(this string? content, int length) => content?
        .SafeSubstring(0, length + 20) // reduce effort
        .StripHtml()
        .Replace("\n", " ")
        .Replace('"', '\'')        
        .Trim()
        .SubstringWithEllipsis(0, length); 
    
    public static IEnumerable<TElement> ValuesWithoutLock<TKey, TElement>(this ConcurrentDictionary<TKey, TElement> source) where TKey : notnull
    {
        foreach (var item in source)
        {
            if (item.Value != null)
                yield return item.Value;
        }
    }

    public static string GetObjectInfoPath(this string deviceId) => 
        deviceId.GetDevicePath().CombineWith("object_info.json");

    public static string GetDevicePath(this string deviceId) => 
        $"devices/{deviceId[..2]}/{deviceId}";
    
    public static Dictionary<string,object?> ParseAsObjectDictionary(this string json) => 
        (Dictionary<string,object?>)JSON.parse(json);
    public static string? GetUserId(this IRequest? req)
    {
        var user = req.GetClaimsPrincipal();
        return user.IsAuthenticated()
            ? user.GetUserId()
            : null;
    }

    public static string GetRequiredUserId(this IRequest? req) =>
        req.GetApiKey()?.UserAuthId ??
        req.GetClaimsPrincipal().GetUserId() 
        ?? throw HttpError.Unauthorized("API Key or Authentication required");

    public static string GetRequiredUserId2(this IRequest? req) => 
        req.GetClaimsPrincipal().GetUserId() ?? throw new ArgumentNullException("UserId");

    public static string GetRequiredUserName(this IRequest? req) => 
        req.GetClaimsPrincipal().GetUserName() ?? throw new ArgumentNullException("UserName");

    public static string AssertApiKeyUserId(this IRequest? req)
    {
        if (req.GetClaimsPrincipal().IsAdmin())
            return AppConfig.Instance.DefaultUserId;
        var apiKey = req.GetApiKey() as ApiKeysFeature.ApiKey
            ?? throw new HttpError(HttpStatusCode.Unauthorized, "Unauthorized");
        if (apiKey.UserId == null)
        {
            if (apiKey.HasScope(ServiceStack.Configuration.RoleNames.Admin))
                return AppConfig.Instance.DefaultUserId;
            throw new HttpError(HttpStatusCode.Unauthorized, "Unauthorized");
        }
        return apiKey.UserId;
    }

    public static string? GetNickName(this ClaimsPrincipal? principal) =>
        principal?.FindFirst(JwtClaimTypes.NickName)?.Value ?? principal.GetDisplayName();

    static bool IsUserNameChar(char c) => c == '-' || (char.IsLetterOrDigit(c) && char.IsLower(c)); 
    
    public static List<string> FindUserNameMentions(this string text)
    {
        var to = new List<string>();
        var s = text.AsSpan();
        s.AdvancePastChar('@');
        while (s.Length > 0)
        {
            var i = 0;
            while (IsUserNameChar(s[i]))
            {
                if (++i >= s.Length)
                    break;
            }
            var candidate = i > 2 ? s[..i].ToString() : "";
            if (candidate.Length > 1)
            {
                to.Add(candidate);
            }
            s = s.Advance(i).AdvancePastChar('@');
        }
        return to;
    }

    public static string HumanifyNumber(this int n)
    {
        if (n < 0)
            return '-' + HumanifyNumber(-n);
        if (n == 0)
            return "0";

        if (n >= 1_000_000_000)
            return trim((n / 1_000_000_000m).ToString("0.0")) + "b";
        if (n >= 1_000_000)
            return trim((n / 1_000_000m).ToString("0.0")) + "m";
        if (n >= 1_000)
            return trim((n / 1_000m).ToString("0.0")) + "k";
        return trim(n.ToString());

        string trim(string s) => s.TrimEnd('0').TrimEnd('.');
    }

    public static string HumanifyTime(this TimeSpan duration)
    {
        if (duration.TotalSeconds < 1)
            return "0s";
        if (duration.TotalSeconds < 60)
            return $"{duration.TotalSeconds:N0}s";
        if (duration.TotalMinutes < 60)
            return $"{duration.TotalMinutes:N0}m" + (duration.TotalSeconds % 60 > 0 ? $" {duration.TotalSeconds % 60:N0}" + "s" : "");
        if (duration.TotalHours < 24)
            return $"{duration.TotalHours:N0}h" + (duration.TotalMinutes % 60 > 0 ? $" {duration.TotalMinutes % 60:N0}" + "m" : "");
        return $"{duration.TotalDays:N0}d";
    }
    
    public static AssetType ToAssetType(this string ext) => ext switch
    {
        "jpg" or "jpeg" or "png" or "webp" or "gif" or "bmp" or "tiff" => AssetType.Image,
        "mp4" or "mov" or "webm" or "mkv" or "avi" or "wmv"  => AssetType.Video,
        "mp3" or "aac" or "flac" or "wav" or "wma" or "m4a" or "opus" or "ogg" => AssetType.Audio,
        "txt" or "md" or "json" => AssetType.Text,
        _ => AssetType.Binary,
    };
    
    public static Rating? ToAssetRating(this string? rating) => rating?.ToUpper() switch
    {
        "G" or "PG" => Rating.PG,
        "M" or "PG-13" or "PG13"=> Rating.PG13,
        "R" => Rating.R,
        "X" => Rating.X,
        "XXX" => Rating.XXX,
        _ => null,
    };
        
    public static Rating ToAssetRating(this IAssetMetadata asset, Rating? minRating)
    {
        if (minRating == Rating.XXX)
            return Rating.XXX;
        
        var ratings = new HashSet<Rating>
        {
            minRating ?? asset.Ratings?.PredictedRating.ToAssetRating() ?? Rating.PG
        };
        if (asset.Tags?.Count > 0)
        {
            foreach (var tag in asset.Tags)
            {
                foreach (var (rating, ratingWords) in AppData.Instance.TagRatings)
                {
                    if (ratingWords.Contains(tag.Key))
                    {
                        ratings.Add(rating);
                    }
                }
            }
        }
        if (asset.Objects?.Count > 0)
        {
            foreach (var obj in asset.Objects)
            {
                foreach (var (rating, ratingWords) in AppData.Instance.TagRatings)
                {
                    if (ratingWords.Contains(obj.Class))
                    {
                        ratings.Add(rating);
                    }
                }
            }
        }
        
        return ratings.GetMaxRating();
    }

    public static Rating GetMaxRating(this HashSet<Rating> ratings)
    {
        if (ratings.Contains(Rating.XXX))
            return Rating.XXX;
        if (ratings.Contains(Rating.X))
            return Rating.X;
        if (ratings.Contains(Rating.R))
            return Rating.R;
        if (ratings.Contains(Rating.M))
            return Rating.M;
        if (ratings.Contains(Rating.PG13))
            return Rating.PG13;
        return Rating.PG;
    }

    public static WorkflowGeneration AssertGeneration(this IDbConnection db, string generationId)
    {
        var gen = db.SingleById<WorkflowGeneration>(generationId);
        return gen ?? throw HttpError.NotFound("Generation not found");
    }

    public static async Task<WorkflowGeneration> AssertGenerationAsync(this IDbConnection db, string generationId)
    {
        var gen = await db.SingleByIdAsync<WorkflowGeneration>(generationId);
        return gen ?? throw HttpError.NotFound("Generation not found");
    }

    public static Artifact AssertArtifact(this IDbConnection db, int artifactId)
    {
        var artifact = db.SingleById<Artifact>(artifactId);
        if (artifact == null)
            throw HttpError.NotFound("Artifact not found");
        return artifact;
    }
    
    public static string AssertValidUser(this IRequest? req, string createdBy)
    {
        var userId = req.GetRequiredUserId();
        if (createdBy != userId && !req.GetClaimsPrincipal().IsAdmin())
            throw HttpError.Forbidden("Access denied");
        return userId;
    }

    public static readonly Rating[] DefaultRatings = [Rating.PG, Rating.PG13];
    public static Rating[] GetRatings(this Rating[]? ratings)
    {
        if (ratings == null || ratings.Length == 0)
            return DefaultRatings;
        return ratings;
    }

    public static ArtifactMetadata ToArtifactMetadata(this Artifact artifact) => new ArtifactMetadata
    {
        FileName = artifact.Url.LastRightPart('/'),
        Created = DateTime.UtcNow.ToUnixTimeMs(),
        Ratings = artifact.Ratings,
        Categories = artifact.Categories,
        Tags = artifact.Tags,
        Objects = artifact.Objects,
        Phash = artifact.Phash,
        Color = artifact.Color,
        Caption = artifact.Caption,
        Description = artifact.Description,
    };

    public static void AssertValidArgs(this Dictionary<string, object?>? Args, Dictionary<string, int> maxLimits)
    {
        if (Args?.Count > 0)
        {
            foreach (var entry in Args)
            {
                if (entry.Key.Length > 30)
                    throw HttpError.BadRequest("Invalid Workflow Args");
                if (maxLimits.TryGetValue(entry.Key, out var max))
                {
                    var longValue = entry.Value.TryGetLongValue();
                    if (longValue > max)
                        throw HttpError.BadRequest($"{entry.Key} exceeds max limit of {max}");
                }
            }
        }
    }

    public static long? TryGetLongValue(this object? o) => o switch
    {
        null => null,
        string s when long.TryParse(s, out var longValue) => longValue,
        long longValue => longValue,
        int intValue => intValue,
        JsonElement { ValueKind: JsonValueKind.Number } jsonValue => (long)jsonValue.GetDouble(),
        _ => null
    };

    public static OwnerAgentInfo ToOwnerAgentInfo(this ComfyAgent from)
    {
        var to = from.ConvertTo<OwnerAgentInfo>();
        return to;
    }

    public static AgentInfo ToAgentInfo(this ComfyAgent from)
    {
        var to = from.ConvertTo<AgentInfo>();
        if (!from.ModelSettings.IsEmpty())
        {
            to.Models = from.GetVisibleModels();
        }
        return to;
    }
}
