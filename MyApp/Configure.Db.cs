using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using ServiceStack.OrmLite;
using MyApp.Data;

[assembly: HostingStartup(typeof(MyApp.ConfigureDb))]

namespace MyApp;

public class ConfigureDb : IHostingStartup
{
    public void Configure(IWebHostBuilder builder) => builder
        .ConfigureServices((context, services) => {
            
            var connectionString = AppConfig.Instance.DefaultConnection
                ?? Environment.GetEnvironmentVariable("COMFY_DB_CONNECTION")
                ?? context.Configuration.GetConnectionString("DefaultConnection")
                ?? throw new Exception("DefaultConnection does not exist");

            services.AddOrmLite(options => options.UsePostgres(connectionString, dialect => {
                    // dialect.NamingStrategy = new OrmLiteNamingStrategyBase();
                })
                .ConfigureJson(json => {
                    // json.DefaultSerializer = JsonSerializerType.ServiceStackJson;
                })
            )
            .AddPostgres(
                "jobs", 
                "Host=localhost;Port=5432;Database=jobs;Username=jobs;Password=jobs;Include Error Detail=true;");
            
            // $ dotnet ef migrations add CreateIdentitySchema
            // $ dotnet ef database update
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseNpgsql(connectionString, b => b.MigrationsAssembly(nameof(MyApp)))
                    .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)) 
                );
            
            // Enable built-in Database Admin UI at /admin-ui/database
            services.AddPlugin(new AdminDatabaseFeature());
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
