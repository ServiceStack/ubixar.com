using System.Data;
using Microsoft.AspNetCore.Mvc.Rendering;
using MyApp.ServiceInterface;
using MyApp.ServiceModel;
using ServiceStack.Configuration;
using ServiceStack.Data;
using ServiceStack.IO;
using ServiceStack.OrmLite;
using ServiceStack.Text;
using ServiceStack.Web;

[assembly: HostingStartup(typeof(MyApp.AppHost))]

namespace MyApp;

public partial class AppHost() : AppHostBase("ubixar.com"), IHostingStartup
{
    public void Configure(IWebHostBuilder builder) => builder
        .ConfigureServices((context,services) => {
            // Configure ASP.NET Core IOC Dependencies
            context.Configuration.GetSection(nameof(AppConfig)).Bind(AppConfig.Instance);
            var appConfig = AppConfig.Instance;
            services.AddSingleton(appConfig);

            appConfig.DefaultConnection = Environment.GetEnvironmentVariable("COMFY_DB_CONNECTION") 
                ?? context.Configuration.GetConnectionString("DefaultConnection");
            appConfig.TaskConnection = context.Configuration.GetConnectionString("TaskConnection");

            var artifactsPath = Environment.GetEnvironmentVariable("COMFY_GATEWAY_ARTIFACTS");
            appConfig.ArtifactsPath = artifactsPath ?? appConfig.ArtifactsPath;
            var filesPath = Environment.GetEnvironmentVariable("AI_FILES_PATH");
            if (filesPath != null)
                appConfig.FilesPath = filesPath;

            appConfig.BunExePath ??= Environment.GetEnvironmentVariable("BUN_EXE_PATH")
                ?? ProcessUtils.FindExePath("bun");
            if (string.IsNullOrEmpty(appConfig.BunExePath))
                appConfig.BunExePath = null;

            services.AddSingleton<AppData>();
            services.AddSingleton(ComfyMetadata.Instance);
            services.AddSingleton<ComfyGateway>();
            services.AddSingleton<AgentEventsManager>();
            
            // Optional: Enable Managed File Uploads: https://docs.servicestack.net/locode/files-overview
            var fileFs = new FileSystemVirtualFiles(appConfig.AppDataPath);
            services.AddPlugin(new FilesUploadFeature(
                // User writable, public readable
                new UploadLocation("avatars", 
                    fileFs,
                    readAccessRole: RoleNames.AllowAnon,
                    maxFileBytes: 10 * 1024 * 1024,
                    resolvePath:ctx => $"avatars/{ctx.UserAuthId}/{ctx.FileName}"),
                new UploadLocation("pub", 
                    fileFs,
                    readAccessRole: RoleNames.AllowAnon,
                    maxFileBytes: 10 * 1024 * 1024,
                    resolvePath:ctx => $"pub/{DateTime.UtcNow.ToUnixTime()}/{ctx.FileName}"),
                // User writable, User readable
                new UploadLocation("secure", 
                    fileFs,
                    maxFileBytes: 10 * 1024 * 1024,
                    resolvePath:ctx => $"users/{ctx.UserAuthId}/{ctx.FileName}")
            ));

            var scripts = InitOptions.ScriptContext; 
            scripts.ScriptAssemblies.Add(typeof(Hello).Assembly);
            scripts.ScriptMethods.Add(new ValidationScripts());

            services.AddSingleton<IComfyWorkflowConverter, CSharpPromptComfyWorkflowConverter>();
            services.AddSingleton<NodeComfyWorkflowConverter>();
            // services.AddSingleton<IComfyWorkflowConverter, CSharpComfyWorkflowConverter>();
            // services.AddSingleton<IComfyWorkflowConverter, NodeComfyWorkflowConverter>();
            
        })
        .ConfigureAppHost(afterConfigure: appHost =>
        {
            appHost.SetConfig(new() {
                AdminAuthSecret = Environment.GetEnvironmentVariable("AI_SERVER_API_KEY")
            });
            
            var services = appHost.GetApplicationServices();
            var appData = AppData.Instance = services.GetRequiredService<AppData>();
            appHost.ServiceName = appData.Config.AppName;
            using var db = services.GetRequiredService<IDbConnectionFactory>().Open(x => x.WithName("AppHost"));
            appData.Reload(db);
            var agentsManager = services.GetRequiredService<AgentEventsManager>();
            agentsManager.Reload(db);
        });

    public override void Configure()
    {
        AppConfig.Instance.GitPagesBaseUrl ??= ResolveGitBlobBaseUrl(ContentRootDirectory);
    }

    public override IDbConnection GetDbConnection(IRequest? req = null)
    {
        if (req == null)
            return base.GetDbConnection(req);
        return base.GetDbConnection(req);
    }
    //
    // public override async Task<IDbConnection> GetDbConnectionAsync(IRequest? req = null)
    // {
    //     if (req == null)
    //         return await base.GetDbConnectionAsync(req);
    //     return (await base.GetDbConnectionAsync(req)).WithName(req?.Dto?.GetType().Name ?? req?.PathInfo ?? "Unknown");
    // }

    public override void OnStartupException(Exception ex)
    {
        base.OnStartupException(ex);
    }

    private string? ResolveGitBlobBaseUrl(IVirtualDirectory contentDir)
    {
        var srcDir = new DirectoryInfo(contentDir.RealPath);
        var gitConfig = new FileInfo(Path.Combine(srcDir.Parent!.FullName, ".git", "config"));
        if (gitConfig.Exists)
        {
            var txt = gitConfig.ReadAllText();
            var pos = txt.IndexOf("url = ", StringComparison.Ordinal);
            if (pos >= 0)
            {
                var url = txt[(pos + "url = ".Length)..].LeftPart(".git").LeftPart('\n').Trim();
                var gitBaseUrl = url.CombineWith($"blob/main/{srcDir.Name}");
                return gitBaseUrl;
            }
        }
        return null;
    }
    
    public static void Register() =>
        Licensing.RegisterLicense("OSS GPL-3.0 2025 https://github.com/ServiceStack/ubixar.com eWsh42R7jS5127+SoqiLlwsyko2ayxa4lF0bQ63/c0LHLR8o/l2VRmok9nFos6Z/KC1uYt5NwoehlK2bg0JRQHNkFS5qfItIK2s5HCo7APkeJvmLq7OVmWCQ0wkSNW1eWDEl/1Ues3ntKbJchzAV7CioRwqfiIhvTZTowd4ovZ0=");
}

public static class HtmlHelpers
{
    public static string ToAbsoluteContentUrl(string? relativePath) => HostContext.DebugMode 
        ? AppConfig.Instance.LocalBaseUrl.CombineWith(relativePath)
        : AppConfig.Instance.PublicBaseUrl.CombineWith(relativePath);
    public static string ToAbsoluteApiUrl(string? relativePath) => HostContext.DebugMode 
        ? AppConfig.Instance.LocalBaseUrl.CombineWith(relativePath)
        : AppConfig.Instance.PublicBaseUrl.CombineWith(relativePath);

    public static string ContentUrl(this IHtmlHelper html, string? relativePath) => ToAbsoluteContentUrl(relativePath); 
    public static string ApiUrl(this IHtmlHelper html, string? relativePath) => ToAbsoluteApiUrl(relativePath);
}
