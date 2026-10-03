using MyApp.ServiceInterface;
using ServiceStack.NativeTypes.TypeScript;

[assembly: HostingStartup(typeof(MyApp.ConfigureDecisionPublishing))]
namespace MyApp;

public class ConfigureDecisionPublishing : IHostingStartup
{
    public void Configure(IWebHostBuilder builder) => builder.ConfigureServices((context, services) =>
    {
        // Portable documents stay JSON DOM values in .NET; generated browser DTOs carry JSON.
        TypeScriptGenerator.TypeAliases["JsonElement"] = "any";
        var options = context.Configuration.GetSection("DecisionPublishing").Get<DecisionPublishingOptions>() ?? new();
        options.Validate();
        services.AddSingleton(options);
        services.AddHttpClient("decision-tags", client => client.Timeout = TimeSpan.FromSeconds(options.TaggingTimeoutSeconds))
            .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler {
                AllowAutoRedirect = false, PooledConnectionLifetime = TimeSpan.FromMinutes(5)
            });
        var apiKey = context.Configuration["Providers:OPENROUTER_API_KEY"];
        if (string.IsNullOrWhiteSpace(apiKey)) apiKey = context.Configuration["OPENROUTER_API_KEY"];
        services.AddSingleton<IDecisionTagger>(services => new JevDecisionTagger(
            services.GetRequiredService<IHttpClientFactory>().CreateClient("decision-tags"), options,
            apiKey,
            services.GetRequiredService<ILogger<JevDecisionTagger>>()));
    });
}
