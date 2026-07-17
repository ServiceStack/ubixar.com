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
                AdminAuthSecret = Environment.GetEnvironmentVariable("AI_SERVER_API_KEY"),
                GlobalResponseHeaders = {
                    ["X-Accel-Buffering"] = "no"
                }
            });
            
            var services = appHost.GetApplicationServices();
            var appData = AppData.Instance = services.GetRequiredService<AppData>();
            appHost.ServiceName = appData.Config.AppName;
            using var db = services.GetRequiredService<IDbConnectionFactory>().Open(configure:x => x.WithTag("AppHost"));
            appData.Reload(db);
            var agentsManager = services.GetRequiredService<AgentEventsManager>();
            agentsManager.Reload(db);
            
            var apiData = new ApiData
            {
                ImageModels =
                [
                    "google/gemini-3.1-flash-lite-image", // $0.25 / $1.50 per 1M
                    "openai/gpt-image-2", // $8 / $8 per 1M
                    "openai/gpt-image-1-mini", // $2.50 / $2.50 per 1M
                    "openai/gpt-image-1", // $10 / $10 per 1M
                    "google/gemini-3.1-flash-image", // $0.50 / $3 per 1M
                    "google/gemini-3-pro-image", // $2 / $12 per 1M
                    "sourceful/riverflow-v2.5-pro", // from $0.13/image
                    "sourceful/riverflow-v2.5-fast", // from $0.019/image
                    "microsoft/mai-image-2.5", // $5/M tokens
                    "x-ai/grok-imagine-image-quality", // from $0.05/image
                    "recraft/recraft-v4.1-pro-vector", // from $0.30/image
                    "recraft/recraft-v4.1-vector", // from $0.08/image
                    "recraft/recraft-v4.1-utility-pro", // from $0.21/image
                    "recraft/recraft-v4.1-utility", // from $0.035/image
                    "recraft/recraft-v4.1-pro", // from $0.21/image
                    "recraft/recraft-v4.1", // from $0.035/image
                    "openai/gpt-5.4-image-2", // $8 / $15 per 1M
                    "black-forest-labs/flux.2-klein-4b", // $0.014/megapixel
                    "bytedance-seed/seedream-4.5", // $0.04/image
                    "black-forest-labs/flux.2-max", // $0.07/megapixel
                    "black-forest-labs/flux.2-flex", // $0.06/megapixel
                    "black-forest-labs/flux.2-pro", // $0.03/megapixel  
                    "openrouter/auto",
                ]
            };
            ScriptContext.Args[nameof(ApiData)] = apiData;
            appData.Workflows.ForEach(x => apiData.ImageModels.AddIfNotExists("llmspy/" + x.Slug));
        });

    public override void Configure()
    {
        AppConfig.Instance.GitPagesBaseUrl ??= ResolveGitBlobBaseUrl(ContentRootDirectory);
    }

    public class ApiData
    {
        public List<string> ImageModels { get; set; } = new();
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
        Licensing.RegisterLicense("OSS BSD-3-Clause 2026 https://github.com/ServiceStack/ubixar.com av0tijSvD6XoVfxMYj2XpfwqGGvNfXQKv2KAr+4BryoshsHurVjvnXmerROagXdI3vxEiWSlNh7fl9KeZgbEVbz7vaFSBMVbjS7HJDQCSRfKvSXtb9swKYqslrW+sX2GncIwR3b5ZW85OcjBhvqLBf/ae4tyPbGLCaSsLnRPpZg=");
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
