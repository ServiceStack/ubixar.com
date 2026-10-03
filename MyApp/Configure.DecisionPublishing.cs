using ServiceStack.NativeTypes.TypeScript;

[assembly: HostingStartup(typeof(MyApp.ConfigureDecisionPublishing))]
namespace MyApp;

public class ConfigureDecisionPublishing : IHostingStartup
{
    public void Configure(IWebHostBuilder builder) => builder.ConfigureServices(_ =>
    {
        // Portable documents stay JSON DOM values in .NET; generated browser DTOs carry JSON.
        TypeScriptGenerator.TypeAliases["JsonElement"] = "any";
    });
}
