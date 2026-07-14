using System.Data;
using MyApp.Data;
using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.OrmLite;
using Microsoft.AspNetCore.Identity;
using ServiceStack.Data;
using ServiceStack.Text;

namespace MyApp.ServiceInterface;

public class UserServices(
    AppData appData,
    UserManager<ApplicationUser> userManager,
    IDbConnectionFactory dbFactory) : Service
{
    public object Get(GetDeletedRows request)
    {
        var lastId = appData.GetMaxDeletedRowId(Db);
        var ret = new GetDeletedRowsResponse
        {
            LastId = lastId,
        };

        if (request.AfterId != null)
        {
            var q = Db.From<DeletedRow>().Where(x => x.Id > request.AfterId);
            q.Take(1000);
            ret.Results = Db.Select(q);
        }

        return ret;
    }

    public async Task<object> Get(MyInfo request)
    {
        var userId = Request.GetRequiredUserId();

        var (user, latestAchievements, latestNotifications, latestCredits) =
            await dbFactory.AsyncDbTasksBuilder()
                .Add(db => db.SingleByIdAsync<User>(userId))
                .Add(db => db.SelectAsync(
                    db.From<Achievement>()
                        .Where(x => x.UserId == userId)
                        .OrderByDescending(x => x.Id)
                        .Take(10)))
                .Add(db => db.SelectAsync(
                    db.From<Notification>()
                        .Where(x => x.UserId == userId)
                        .OrderByDescending(x => x.Id)
                        .Take(10)))
                .Add(db => db.SelectAsync(
                    db.From<CreditLog>()
                        .Where(x => x.UserId == userId)
                        .OrderByDescending(x => x.Id)
                        .Take(10)))
                .RunAsync();

        var userIds = new HashSet<string>();
        userIds.AddDistinctRange(latestAchievements
            .Where(x => x.RefUserId != null)
            .Map(x => x.RefUserId!));
        userIds.AddDistinctRange(latestNotifications
            .Where(x => x.RefUserId != null)
            .Map(x => x.RefUserId!));
        var userNameMap = appData.GetUserCache(Db, userIds);

        appData.UpdateUserCache(user);
        var ret = new UserInfo
        {
            Karma = user.Karma,
            Credits = user.Credits,
            QuotaTier = user.QuotaTier,
            LastBonusDate = user.LastBonusDate,
            ClaimBonusMessage = user.LastBonusDate?.Date == DateTime.UtcNow.Date
                ? null
                : $"Claim {appData.Config.DailyBonusCredits.HumanifyNumber()} daily credits",
            LastReadNotificationId = user.Prefs.LastReadNotificationId,
            LastReadAchievementId = user.Prefs.LastReadAchievementId,
            Modified = user.ModifiedDate.ToUnixTimeMs(),
        };

        ret.LatestAchievements = latestAchievements.Map(x => new MyAchievement
        {
            Id = x.Id,
            Type = x.Type,
            Title = x.Title,
            GenerationId = x.GenerationId,
            ArtifactId = x.ArtifactId,
            RefId = x.RefId,
            RefUserName = userNameMap.GetUserName(x.RefUserId),
            Score = x.Score,
            Created = x.CreatedDate.ToUnixTimeMs(),
        });

        ret.LatestNotifications = latestNotifications.Map(x => new MyNotification
        {
            Id = x.Id,
            Type = x.Type,
            GenerationId = x.GenerationId,
            ArtifactId = x.ArtifactId,
            RefId = x.RefId,
            Summary = x.Summary,
            Created = x.CreatedDate.ToUnixTimeMs(),
            Href = x.Href,
            Title = x.Title,
            RefUserName = userNameMap.GetUserName(x.RefUserId),
        });

        ret.LatestCredits = latestCredits.Map(x => new MyCreditLog
        {
            Credits = x.Credits,
            Reason = x.Reason,
            Description = x.Description,
            Created = x.CreatedDate.ToUnixTimeMs(),
            RefId = x.RefId,
            RefUserName = userNameMap.GetUserName(x.RefUserId),
        });

        return ret;
    }

    public async Task<object> Any(UpdatePreferences request)
    {
        var userId = Request.GetClaimsPrincipal().GetUserId();
        if (request.Ratings != null)
        {
            await Db.UpdateOnlyAsync(() => new User
            {
                Ratings = request.Ratings,
                ModifiedDate = DateTime.UtcNow,
            }, x => x.Id == userId);
        }

        if (request.LastReadNotificationId != null || request.LastReadAchievementId != null)
        {
            var user = await Db.SingleByIdAsync<User>(userId)
                       ?? throw HttpError.NotFound("User not found");

            if (request.LastReadNotificationId != null)
                user.Prefs.LastReadNotificationId = request.LastReadNotificationId.Value;
            if (request.LastReadAchievementId != null)
                user.Prefs.LastReadAchievementId = request.LastReadAchievementId.Value;

            await Db.UpdateOnlyAsync(() => new User
            {
                Prefs = user.Prefs,
                ModifiedDate = DateTime.UtcNow,
            }, x => x.Id == userId);
        }

        return new EmptyResponse();
    }

    public async Task<object> Any(UpdateUserAvatar request)
    {
        var userId = Request.GetClaimsPrincipal().GetUserId();
        var user = await userManager.FindByIdAsync(userId);
        if (user == null)
            throw HttpError.NotFound("User not found");

        // The Avatar property will be automatically populated by ServiceStack's file upload feature
        if (!string.IsNullOrEmpty(request.Avatar))
        {
            user.Avatar = request.Avatar;
            await userManager.UpdateAsync(user);
        }

        return new EmptyResponse();
    }

    public async Task<object> Post(ClaimBonusCredits request)
    {
        var userId = Request.GetRequiredUserId();
        var now = DateTime.UtcNow;
        var today = now.Date;

        var user = await Db.SingleByIdAsync<User>(userId);
        if (user == null)
            throw HttpError.NotFound("User not found");

        // Check if user has already claimed today's bonus
        if (user.LastBonusDate?.Date == today)
            throw HttpError.Conflict("You have already claimed today's bonus");

        var dailyBonusCredits = appData.Config.DailyBonusCredits;

        // Log the credit transaction
        await Db.InsertAsync(new CreditLog
        {
            UserId = userId,
            Credits = dailyBonusCredits,
            Reason = CreditReason.DailyBonus,
            Description = "Daily bonus claimed",
            CreatedDate = now,
        });

        // Update user cache
        user.Credits += dailyBonusCredits;
        user.LastBonusDate = now;
        user.ModifiedDate = now;

        await Db.UpdateOnlyAsync(() => new User
        {
            Credits = user.Credits,
            LastBonusDate = user.LastBonusDate,
            ModifiedDate = user.ModifiedDate,
        }, x => x.Id == userId);

        appData.UpdateUserCache(user);

        return new ClaimBonusCreditsResponse
        {
            CreditsAwarded = dailyBonusCredits,
            Message = $"{dailyBonusCredits} credits added!",
        };
    }

    public async Task<object> Post(RegisterExternalUser request)
    {
        if (string.IsNullOrWhiteSpace(request.UserName))
            throw HttpError.BadRequest("Username is required.");

        var existingUser = await userManager.FindByNameAsync(request.UserName);
        if (existingUser != null)
            throw HttpError.Conflict($"Username '{request.UserName}' is already taken.");

        var email = request.Email;
        var existingEmail = await userManager.FindByEmailAsync(email);
        if (existingEmail != null)
            throw HttpError.Conflict($"Email '{email}' is already registered.");

        var feature = this.AssertPlugin<ApiKeysFeature>();

        var password = feature.GenerateApiKey();
        var autoConfirmEmailDomains = new [] {
            "@llmspy.org",
        };
        var appUser = new ApplicationUser
        {
            UserName = request.UserName,
            Email = email,
            ProfileUrl = ImageCreator.Instance.CreateSvgDataUri(char.ToUpper(request.UserName[0])),
            CreatedDate = DateTime.UtcNow,
            ModifiedDate = DateTime.UtcNow,
            EmailConfirmed = autoConfirmEmailDomains.Any(d => email.EndsWith(d, StringComparison.OrdinalIgnoreCase)),
        };

        var result = await userManager.CreateAsync(appUser, password);
        if (!result.Succeeded)
        {
            throw new HttpError(System.Net.HttpStatusCode.BadRequest,
                string.Join(", ", result.Errors.Select(e => e.Description)));
        }

        using var db = dbFactory.OpenDbConnection();
        var dbUser = appUser.ToUser();
        await db.InsertAsync(dbUser);
        await db.InsertAsync(new CreditLog
        {
            UserId = appUser.Id,
            Credits = 20_000,
            Reason = CreditReason.SignupBonus,
            Description = "External signup bonus",
            CreatedDate = DateTime.UtcNow,
        });

        appData.UpdateUserCache(dbUser);

        var apiKey = await feature.InsertAsync(db, new()
        {
            Key = password,
            Name = $"API Key for {request.UserName}",
            UserId = appUser.Id,
            UserName = appUser.UserName,
            CreatedDate = DateTime.UtcNow,
        });

        // Change password to API Key
        return new RegisterExternalUserResponse
        {
            ApiKey = apiKey.Key,
            UserName = appUser.UserName,
            UserId = appUser.Id,
        };
    }

    public async Task<object> Get(GenerateUsernames request)
    {
        var suggestions = await Db.GenerateUnusedCandidateUsernames(
            request.Count ?? 5, request.UserName);
        return new GenerateUsernamesResponse
        {
            Suggestions = suggestions
        };
    }

    public async Task<object> Post(CheckUsername request)
    {
        var username = request.UserName.Trim();

        // Validate: alphanumeric and underscores only
        var isValid = username.All(c => char.IsLetterOrDigit(c) || c == '_');
        if (!isValid)
            throw new Exception("Username can only contain letters, numbers, and underscores.");

        // Check if taken
        var existingUser = await userManager.FindByNameAsync(username);
        var isTaken = existingUser != null;

        if (isTaken)
            throw new Exception("Username is already taken.");
        
        return new CheckUsernameResponse();
    }

}