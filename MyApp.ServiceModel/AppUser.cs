using System.Runtime.Serialization;
using ServiceStack;
using ServiceStack.DataAnnotations;

namespace MyApp.ServiceModel;

// Add profile data for application users by adding properties to the AppUser class
[Alias("AspNetUsers")]
public class AppUser 
{
    [Alias("Id")]
    public string Id { get; set; }
    public string? UserName { get; set; }
    public virtual string? NormalizedUserName { get; set; }
    public string? Email { get; set; }
    public string? NormalizedEmail { get; set; }
    public bool EmailConfirmed { get; set; }
    public bool TwoFactorEnabled { get; set; }
    public DateTimeOffset? LockoutEnd { get; set; }
    public bool LockoutEnabled { get; set; }
    public virtual int AccessFailedCount { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? DisplayName { get; set; }
    public string? ProfileUrl { get; set; }
    [Input(Type = "file"), UploadTo("avatars")]
    public string? Avatar { get; set; } //overrides ProfileUrl
    public string? Handle { get; set; }
    public int? RefId { get; set; }
    public string RefIdStr { get; set; } = Guid.NewGuid().ToString();
    public bool IsArchived { get; set; }
    public DateTime? ArchivedDate { get; set; }
    public string? LastLoginIp { get; set; }
    public DateTime? LastLoginDate { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime ModifiedDate { get; set; } = DateTime.UtcNow;
    public DateTime? LockedDate { get; set; }
    public DateTime? BanUntilDate { get; set; }
    public string? FacebookUserId { get; set; }
    public string? GoogleUserId { get; set; }
    public string? GoogleProfilePageUrl { get; set; }
    public string? MicrosoftUserId { get; set; }
}
