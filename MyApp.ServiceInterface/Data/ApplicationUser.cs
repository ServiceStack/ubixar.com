using System.Runtime.Serialization;
using Microsoft.AspNetCore.Identity;
using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.DataAnnotations;

namespace MyApp.Data;

// Add profile data for application users by adding properties to the ApplicationUser class
[Alias("AspNetUsers")]
public class ApplicationUser : IdentityUser
{
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
    public string? Ratings { get; set; } // store as delimited string for EF

    public User ToUser()
    {
        return new User
        {
            Id = Id,
            UserName = UserName ?? throw new ArgumentNullException(nameof(UserName), $"{Id} {Email}"),
            Ratings = Ratings?.Split(',').Map(x => (Rating)Enum.Parse(typeof(Rating), x)) ?? [],
            ProfileUrl = ProfileUrl,
            ModifiedDate = ModifiedDate,
        };
    }
}
