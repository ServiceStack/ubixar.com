using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using ServiceStack.OrmLite;
using MyApp.Data;

[assembly: HostingStartup(typeof(MyApp.ConfigureDb))]

namespace MyApp;

public class SeedUser
{
    public string Email { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string[]? Roles { get; set; }
}

public class ConfigureDb : IHostingStartup
{
    public void Configure(IWebHostBuilder builder) => builder
        .ConfigureServices((context, services) => {
            
            var connectionString = AppConfig.Instance.DefaultConnection
                ?? context.Configuration.GetConnectionString("DefaultConnection")
                ?? throw new Exception("DefaultConnection does not exist");

            services.AddOrmLite(options => options.UsePostgres(connectionString, dialect => {
                    //dialect.NamingStrategy = new OrmLiteNamingStrategyBase();
                })
                .ConfigureJson(json => {
                    // json.DefaultSerializer = JsonSerializerType.SystemJson;
                })
            );
            
            // $ dotnet ef migrations add CreateIdentitySchema
            // $ dotnet ef database update
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseNpgsql(connectionString, b => b.MigrationsAssembly(nameof(MyApp)))
                    .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)) 
                );
            
            // Enable built-in Database Admin UI at /admin-ui/database
            services.AddPlugin(new AdminDatabaseFeature());

            // LoggingOrmLiteExecFilter.Configure();
        });
}

// Used by dotnet ef
public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        optionsBuilder.UseNpgsql("", b => b.MigrationsAssembly(nameof(MyApp)));
        return new ApplicationDbContext(optionsBuilder.Options);
    }
}
