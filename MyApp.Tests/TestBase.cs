using System.Data;
using Microsoft.Extensions.DependencyInjection;
using ServiceStack;
using ServiceStack.Data;
using ServiceStack.OrmLite;

namespace MyApp.Tests;

public class TestBase
{
    public const string DeviceId = "d09bee1cb0cc4df0984d35b052e8df18";
    public const string BaseUrl = "https://localhost:5001";
    public string ApiKey = Environment.GetEnvironmentVariable("AI_SERVER_API_KEY");
    public void ApiKeyFilter(HttpRequestMessage req) => req.With(x => x.SetAuthBearer(ApiKey));

    public JsonApiClient CreateClientWithApiKey() => new(BaseUrl) {
        BearerToken = ApiKey
    };

    public TestBase() => AppHost.Register();
}

public class DatabaseTestsBase : TestBase
{
    protected readonly ServiceCollection services = new();
    protected readonly IServiceProvider serviceProvider;

    public DatabaseTestsBase()
    {
        Console.WriteLine("COMFY_DB_CONNECTION");
        Console.WriteLine(Environment.GetEnvironmentVariable("COMFY_DB_CONNECTION"));
        
        services.AddOrmLite(options => 
            options.UsePostgres(Environment.GetEnvironmentVariable("COMFY_DB_CONNECTION"), 
                dialect => {
                }))
            .AddPostgres(
                "jobs",
                "Host=localhost;Port=5432;Database=jobs;Username=jobs;Password=jobs;Include Error Detail=true;");

        serviceProvider = services.BuildServiceProvider();
    }
    
    protected IDbConnectionFactory DbFactory => serviceProvider.GetRequiredService<IDbConnectionFactory>();
    protected IDbConnection OpenDb() => DbFactory.Open();
}