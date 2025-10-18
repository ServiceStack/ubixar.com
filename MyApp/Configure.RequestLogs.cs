using ServiceStack.Jobs;
using ServiceStack.Web;

[assembly: HostingStartup(typeof(MyApp.ConfigureRequestLogs))]

namespace MyApp;

public class ConfigureRequestLogs : IHostingStartup
{
    public void Configure(IWebHostBuilder builder) => builder
        .ConfigureServices((context, services) => {
            
            services.AddPlugin(new RequestLogsFeature {
                // RequestLogger = new SqliteRequestLogger {
                //     DbDir = Path.Combine(context.Configuration.GetAppDataPath(), "requests")
                // },
                RequestLogger = new DbRequestLogger {
                    NamedConnection = "jobs"
                },
                // EnableResponseTracking = true,
                EnableRequestBodyTracking = true,
                EnableErrorTracking = true
            });
            services.AddHostedService<RequestLogsHostedService>();
            
            if (context.HostingEnvironment.IsDevelopment())
            {
                services.AddPlugin(new ProfilingFeature
                {
                    IncludeStackTrace = true,
                });
            }            
        });
}

public class RequestLogsHostedService(ILogger<RequestLogsHostedService> log, IRequestLogger requestLogger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(3));
        if (requestLogger is SqliteRequestLogger sqliteRequestLogger)
        {
            while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
            {
                sqliteRequestLogger.Tick(log);
            }
        }
        else if (requestLogger is DbRequestLogger dbRequestLogger)
        {
            while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
            {
                await dbRequestLogger.TickAsync(log, stoppingToken);
            }
        }
    }
}
