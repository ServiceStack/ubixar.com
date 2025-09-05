using ServiceStack;
using ServiceStack.DataAnnotations;

namespace MyApp.ServiceModel;

[Icon(Svg = "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path fill='currentColor' d='M12 4a4 4 0 0 1 4 4a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4'/></svg>")]
public class User
{
    [PrimaryKey]
    public string Id { get; set; } // 1:1 with AspNetUsers/ApplicationUser.Id
    public string UserName { get; set; }
    [PgSqlJsonB]
    public List<Rating> Ratings { get; set; }
    public string? ProfileUrl { get; set; }
    [PgSqlJsonB]
    public UserPrefs Prefs { get; set; } = new();
    public int Karma { get; set; }
    public int Credits { get; set; }
    public QuotaTier QuotaTier { get; set; }
    public DateTime? LastBonusDate { get; set; }
    public DateTime ModifiedDate { get; set; }
}
public class UserPrefs
{
    public int LastReadNotificationId { get; set; }
    public int LastReadAchievementId { get; set; }
}
public class UserCache
{
    public string Id { get; set; }
    public string UserName { get; set; }
    public int Karma { get; set; }
    public int Credits { get; set; }
}
public class CreditLog
{
    [AutoIncrement]
    public int Id { get; set; }
    [Index]
    public string UserId { get; set; }
    public int Credits { get; set; }
    public CreditReason? Reason { get; set; }
    public string? Description { get; set; }
    public string? RefId { get; set; }
    public string? RefUserId { get; set; }
    public DateTime CreatedDate { get; set; }
}
public enum CreditReason
{
    SignupBonus, // 5000
    GenerationDebit,
    GenerationCredit,
    DailyBonus, // 2000
}

public class UserInfo
{
    public int Karma { get; set; }
    public int Credits { get; set; }
    public QuotaTier QuotaTier { get; set; }
    public int LastReadNotificationId { get; set; }
    public int LastReadAchievementId { get; set; }
    public long Modified { get; set; }

    public DateTime? LastBonusDate { get; set; }
    public string? ClaimBonusMessage { get; set; }
    /// <summary>
    /// Time till next daily bonus
    /// </summary>
    public TimeSpan TimeTillNextBonus => LastBonusDate == null || LastBonusDate.Value.Date != DateTime.UtcNow.Date 
        ? TimeSpan.Zero 
        : DateTime.UtcNow.Date.AddDays(1) - DateTime.UtcNow;
    
    public List<MyAchievement> LatestAchievements { get; set; } = [];
    public List<MyNotification> LatestNotifications { get; set; } = [];
    public List<MyCreditLog> LatestCredits { get; set; } = [];
    
    public bool HasUnreadAchievements => LatestAchievements.Any(x => x.Id > LastReadAchievementId);
    public bool HasUnreadNotifications => LatestNotifications.Any(x => x.Id > LastReadNotificationId);
}

public enum QuotaTier
{
    Free,
    Contributor,
    Plus,
    Pro,
    Moderator,
}

public class Achievement
{
    [AutoIncrement]
    public int Id { get; set; }
    [Index] public string UserId { get; set; }
    public AchievementType Type { get; set; }
    public string? Title { get; set; }
    public string? GenerationId { get; set; }
    public int? ArtifactId { get; set; }
    public string? RefId { get; set; }
    public string? RefUserId { get; set; }
    public int Score { get; set; }
    public DateTime CreatedDate { get; set; }
}

public class MyAchievement
{
    public int Id { get; set; }
    public AchievementType Type { get; set; }
    public string? Title { get; set; }
    public string? GenerationId { get; set; }
    public int? ArtifactId { get; set; }
    public string? RefId { get; set; }
    public string? RefUserName { get; set; }
    public int Score { get; set; }
    public long Created { get; set; }
}

[Flags, EnumAsInt]
public enum AchievementType
{
    Unknown = 0,
    PublishedGeneration = 1,
    ArtifactReaction = 2,
    CommentReaction = 3,
    GenerationComment = 4,
    AddedToCollection = 5,
}

public class Notification
{
    [AutoIncrement]
    public int Id { get; set; }
    [Index]
    public string UserId { get; set; }
    public NotificationType Type { get; set; }
    public string? GenerationId { get; set; }
    public int? ArtifactId { get; set; }
    public string RefId { get; set; } // Comment
    public string Summary { get; set; } //100 chars
    public DateTime CreatedDate { get; set; }
    public string? Href { get; set; }
    public string? Title { get; set; } //100 chars
    public string? RefUserId { get; set; }
}

public class MyNotification
{
    public int Id { get; set; }
    public NotificationType Type { get; set; }
    public string? GenerationId { get; set; }
    public int? ArtifactId { get; set; }
    public string RefId { get; set; } // Generation or Comment
    public string Summary { get; set; } //100 chars
    public long Created { get; set; }
    public string? Href { get; set; }
    public string? Title { get; set; } //100 chars
    public string? RefUserName { get; set; }
}

public class MyCreditLog
{
    public int Credits { get; set; }
    public CreditReason? Reason { get; set; }
    public string? Description { get; set; }
    public string? RefId { get; set; }
    public string? RefUserName { get; set; }
    public long Created { get; set; }
}

[Flags, EnumAsInt]
public enum NotificationType
{
    Unknown = 0,
    NewComment = 1,
    CommentMention = 2,
    NewBadge = 3,
}

[ValidateIsAuthenticated]
public class MyInfo : IGet, IReturn<UserInfo>
{
}

[ValidateIsAuthenticated]
public class UpdatePreferences : IPost, IReturn<EmptyResponse>
{
    public List<Rating>? Ratings { get; set; }
    public int? LastReadNotificationId { get; set; }
    public int? LastReadAchievementId { get; set; }
}

[ValidateIsAuthenticated]
public class UpdateUserAvatar : IPost, IReturn<EmptyResponse>
{
    [Input(Type = "file"), UploadTo("avatars")]
    public string? Avatar { get; set; }
}

[ValidateIsAuthenticated]
public class ClaimBonusCredits : IPost, IReturn<ClaimBonusCreditsResponse>
{
}

public class ClaimBonusCreditsResponse
{
    public int CreditsAwarded { get; set; }
    public string? Message { get; set; }
    public ResponseStatus? ResponseStatus { get; set; }
}

public class GetDeletedRows : IGet, IReturn<GetDeletedRowsResponse>
{
    public int? AfterId { get; set; }
}

public class GetDeletedRowsResponse
{
    public int LastId { get; set; }
    public List<DeletedRow> Results { get; set; }
    public ResponseStatus? ResponseStatus { get; set; }
}

public class DeletedRow
{
    [AutoIncrement]
    public int Id { get; set; }
    public Table Table { get; set; }
    public string Key { get; set; }
}

[Flags]
public enum Table
{
    Artifact = 1,
    ArtifactTag = 2,
    ArtifactCategory = 3,
    ArtifactReaction = 4,
    HiddenArtifact = 5,
    Thread = 6,
    Comment = 7,
    Workflow = 8,
    WorkflowGeneration = 9,
    WorkflowVersion = 10,
    Achievement = 11,
}
