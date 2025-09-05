namespace MyApp;

public static class HostExtensions
{
    public static string GetAppDataPath(this IConfiguration config)
    {
        // Get AppDataPath from config: { "AppConfig": { "AppDataPath": "../App_Data" } }
        return config.GetSection("AppConfig")?.GetValue<string>("AppDataPath") ?? "App_Data";
    }
}