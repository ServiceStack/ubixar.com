using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using MyApp.Data;
using MyApp.Migrations;
using MyApp.ServiceInterface;
using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.Data;
using ServiceStack.OrmLite;
using ServiceStack.Text;

[assembly: HostingStartup(typeof(MyApp.ConfigureDbMigrations))]

namespace MyApp;

// Code-First DB Migrations: https://docs.servicestack.net/ormlite/db-migrations
public class ConfigureDbMigrations : IHostingStartup
{
    public void Configure(IWebHostBuilder builder) => builder
        .ConfigureAppHost(appHost =>
        {
            if (AppTasks.IsRunAsAppTask())
            {
                JS.Configure();
            }
            
            var migrator = new Migrator(appHost.Resolve<IDbConnectionFactory>(), typeof(Migration1000).Assembly);
            AppTasks.Register("migrate", _ =>
            {
                var log = appHost.GetApplicationServices().GetRequiredService<ILogger<ConfigureDbMigrations>>();

                log.LogInformation("Running EF Migrations...");
                var scopeFactory = appHost.GetApplicationServices().GetRequiredService<IServiceScopeFactory>();
                using (var scope = scopeFactory.CreateScope())
                {
                    using var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                    db.Database.EnsureCreated();
                    db.Database.Migrate();

                    // Only seed users if DB was just created
                    if (!db.Users.Any())
                    {
                        log.LogInformation("Adding Seed Users...");
                        AddSeedUsers(scope.ServiceProvider).Wait();
                    }
                }

                log.LogInformation("Running OrmLite Migrations...");
                migrator.Run();
            });
            AppTasks.Register("migrate.revert", args => migrator.Revert(args[0]));
            AppTasks.Register("migrate.rerun", args => migrator.Rerun(args[0]));
            AppTasks.Register("adhoc", args => {
                var Db = migrator.DbFactory.OpenDbConnection();
                // var log = NullLogger.Instance;
                Db.DropAndCreateTable<ComfyAgent>();
                Db.DropAndCreateTable<DeletedRow>();
                // Db.DropAndCreateTable<CreditLog>();
            });
            AppTasks.Register("metadata", args =>
            {
                var db = migrator.DbFactory.OpenDbConnection();
                var artifacts = db.Select<Artifact>();
                var ArtifactsPath = AppConfig.Instance.ArtifactsPath;

                // find all *.json files in ArtifactsPath
                var files = Directory.GetFiles(ArtifactsPath, "*.json", SearchOption.AllDirectories);
                foreach (var filePath in files)
                {
                    var json = File.ReadAllText(filePath);
                    var metadata = json.FromJson<ArtifactMetadata>();
                    if (metadata.FileName != null)
                    {
                        var artifactUrl = "/artifacts".CombineWith(metadata.FileName);
                        var matchingArtifacts = artifacts.Where(x => x.Url == artifactUrl).ToList();
                        var artifact = matchingArtifacts.FirstOrDefault();
                        if (artifact != null)
                        {
                            Console.WriteLine($"Update Artifact {artifact.Id} from {artifact.GenerationId}: {artifact.Url} ({artifact.Length})");
                            db.UpdateOnly(() => new Artifact
                            {
                                Ratings = metadata.Ratings,
                                Categories = metadata.Categories,
                                Tags = metadata.Tags,
                                Objects = metadata.Objects,
                                Phash = metadata.Phash,
                                Color = metadata.Color,
                            }, x => x.Id == artifact.Id);
                        }
                    }
                    else
                    {
                        metadata.PrintDump();
                        throw new Exception($"Filename missing in {filePath}");
                    }
                }
            });
            AppTasks.Run();
        });

    private async Task AddSeedUsers(IServiceProvider services)
    {
        //initializing custom roles 
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        string[] allRoles = [Roles.Admin, Roles.Manager, Roles.Employee];

        void assertResult(IdentityResult result)
        {
            if (!result.Succeeded)
                throw new Exception(result.Errors.First().Description);
        }

        async Task EnsureUserAsync(ApplicationUser user, string password, string[]? roles = null)
        {
            var existingUser = await userManager.FindByEmailAsync(user.Email!);
            if (existingUser != null) return;

            await userManager!.CreateAsync(user, password);
            if (roles?.Length > 0)
            {
                var newUser = await userManager.FindByEmailAsync(user.Email!);
                assertResult(await userManager.AddToRolesAsync(user, roles));
            }
        }

        foreach (var roleName in allRoles)
        {
            var roleExist = await roleManager.RoleExistsAsync(roleName);
            if (!roleExist)
            {
                //Create the roles and seed them to the database
                assertResult(await roleManager.CreateAsync(new IdentityRole(roleName)));
            }
        }

        await EnsureUserAsync(new ApplicationUser
        {
            Id = "0c9fe851-fa92-4e63-a916-c89631b77336",
            DisplayName = "Admin User",
            Email = "admin@email.com",
            UserName = "admin@email.com",
            FirstName = "Admin",
            LastName = "User",
            EmailConfirmed = true,
            ProfileUrl = ImageCreator.Instance.CreateSvgDataUri('A'),
        }, "p@55wOrd", allRoles);

        await EnsureUserAsync(new ApplicationUser
        {
            Id = "3DA81EB3-12FA-4012-986D-3D6B08765649",
            DisplayName = "System User",
            Email = "system@email.com",
            UserName = "admin",
            FirstName = "System",
            LastName = "User",
            EmailConfirmed = true,
            ProfileUrl = ImageCreator.Instance.CreateSvgDataUri('S'),
        }, "p@55wOrd");

        await EnsureUserAsync(new ApplicationUser
        {
            Id = "5B3DF8CA-6AB3-4BEE-AAFC-8FB0C8DF349D",
            DisplayName = "gateway",
            Email = "gateway@gmail.com",
            UserName = "gateway",
            FirstName = "Gateway",
            EmailConfirmed = true,
            ProfileUrl = ImageCreator.Instance.CreateSvgDataUri('U'),
        }, "p@55wOrd", allRoles);
        
        await EnsureUserAsync(new ApplicationUser
        {
            Id = "CE6C1409-20C9-436E-ABB5-832F15A2A863",
            DisplayName = "Test User",
            Email = "test@email.com",
            UserName = "test",
            FirstName = "Test",
            LastName = "User",
            EmailConfirmed = true,
            ProfileUrl = ImageCreator.Instance.CreateSvgDataUri('T'),
        }, "p@55wOrd");
    }
}
