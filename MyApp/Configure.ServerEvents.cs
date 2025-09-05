#if NET9_0_OR_GREATER
using System.Net;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;
using MyApp.ServiceInterface;
using ServiceStack.Text;
using ServiceStack.Web;
using JsonSerializer = System.Text.Json.JsonSerializer;

[assembly: HostingStartup(typeof(MyApp.ConfigureServerEvents))]

namespace MyApp;

public class ConfigureServerEvents : IHostingStartup
{
    public void Configure(IWebHostBuilder builder) => builder
        .ConfigureServices((context, services) =>
        {
            services.AddSingleton<AgentEventsManager>();
        });
}

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary);
record SportScore(int Team1Score, int Team2Score);

public static class ConfigureServerEventsExtensions
{
    private static long connections;
    private static long messages; 
    
    public static IApplicationBuilder UseServerEvents(this WebApplication app)
    {
        var summaries = new[]
        {
            "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
        };

        async Task WriteEventAsync(HttpContext ctx, ServerEvent msg)
        {
            if (msg.Id.GetValueOrDefault() > 0)
            {
                await ctx.Response.WriteAsync($"id: {msg.Id}\n");
            }
            if (msg.Event != null)
            {
                await ctx.Response.WriteAsync($"event: {msg.Event}\n");
            }
            if (msg.Retry.GetValueOrDefault() > 0)
            {
                await ctx.Response.WriteAsync($"retry: {msg.Retry}\n");
            }
            if (msg.Data != null)
            {
                await ctx.Response.WriteAsync("data: ");
                await JsonSerializer.SerializeAsync(ctx.Response.Body, msg.Data);
            }
            await ctx.Response.WriteAsync("\n\n");
            await ctx.Response.Body.FlushAsync();
        }

        app.MapGet("/agents/{deviceId}/test", async (HttpContext ctx) =>
        {
            var apiKey = ctx.Request.Headers.Authorization.ToString().RightPart(' ');
            var deviceId = ctx.Request.RouteValues["deviceId"]?.ToString();
            Console.WriteLine($"apiKey: {apiKey}, deviceId: {deviceId}");
            
            ctx.Response.Headers.Append(HeaderNames.ContentType, "text/event-stream");
            while (!ctx.RequestAborted.IsCancellationRequested)
            {
                if (Random.Shared.Next(2) == 0)
                {
                    var forecast = new WeatherForecast
                    (
                        DateOnly.FromDateTime(DateTime.Now.AddDays(Random.Shared.Next(8))),
                        Random.Shared.Next(-40, 50),
                        summaries[Random.Shared.Next(summaries.Length)]
                    );

                    await WriteEventAsync(ctx, new() { Event = "WeatherForecast", Data = forecast });
                } 
                else
                {
                    var score = new SportScore(Random.Shared.Next(10), Random.Shared.Next(10));
                    await WriteEventAsync(ctx, new() { Event = "SportScore", Data = score });
                }
                await Task.Delay(5000);
            }
        });

        app.MapGet("/agents/{deviceId}/events", async (
            [FromServices] ILogger<ServerEvent> log,
            [FromServices] IApiKeySource apiKeyValidator, 
            [FromServices] AgentEventsManager agentManager, 
            [FromServices] AppData appData, 
            HttpContext ctx) => 
        {
            string bearerToken;
            string deviceId;
            string? userId;
            
            ctx.Response.Headers.Append("X-Accel-Buffering", "no");
            ctx.Response.Headers.Append(HeaderNames.ContentType, "text/event-stream");
            ctx.Response.Headers.Append(HeaderNames.CacheControl, "no-cache");
            
            try
            {
                bearerToken = ctx.Request.Headers.Authorization.ToString().RightPart(' ');
                if (string.IsNullOrEmpty(bearerToken))
                {
                    ctx.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                    await WriteEventAsync(ctx, new ServerEvent { Event = "error", Data = "Unauthorized" });
                    return;
                }

                deviceId = ctx.Request.RouteValues["deviceId"]?.ToString();
                if (string.IsNullOrEmpty(deviceId) || deviceId.Length < 32 || deviceId.Length > 36)
                {
                    ctx.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await WriteEventAsync(ctx, new ServerEvent { Event = "error", Data = "Invalid DeviceId" });
                    return;
                }

                var apiKey = await apiKeyValidator.GetApiKeyAsync(bearerToken) as ApiKeysFeature.ApiKey
                    ?? throw new HttpError(HttpStatusCode.Unauthorized, "Unauthorized");

                userId = apiKey.UserId;
                log.LogInformation("Received SSE Connection #{connection} for: {deviceId}, from: {apiKey} {userId}", 
                    Interlocked.Increment(ref connections), deviceId, apiKey.VisibleKey, userId);
            }
            catch (Exception e)
            {
                if (e is IHttpError httpError)
                {
                    ctx.Response.StatusCode = (int)httpError.StatusCode;
                }
                else
                {
                    ctx.Response.StatusCode = 500;
                }
                await WriteEventAsync(ctx, new ServerEvent { Event = "error", Data = e.Message });
                return;
            }

            var connected = new Dictionary<string, object>
            {
                ["id"] = Interlocked.Read(ref connections),
                ["deviceId"] = deviceId,
                ["created"] = DateTime.UtcNow.ToUnixTime(),
            };
            if (!string.IsNullOrEmpty(userId))
                connected["userId"] = userId;
            
            await WriteEventAsync(ctx, new ServerEvent { Event = "connected", Data = connected });

            var registerMsg = appData.AgentConnected(deviceId);
            if (registerMsg != null)
            {
                await WriteEventAsync(ctx, registerMsg);
            }

            while (!ctx.RequestAborted.IsCancellationRequested)
            {
                var agentEvents = agentManager.GetAgentEvents(deviceId);
                if (agentEvents.TryTake(out var msg, 30_000, ctx.RequestAborted))
                {
                    await WriteEventAsync(ctx, msg);
                }
                else
                {
                    var heartbeatEvent = appData.AgentHeartbeat(deviceId);
                    await WriteEventAsync(ctx, heartbeatEvent);
                }
            }
        });

        return app;
    }
}
#endif
