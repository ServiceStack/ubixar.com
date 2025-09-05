using System.Data;
using Microsoft.Extensions.DependencyInjection;
using MyApp.ServiceModel;
using NUnit.Framework;
using ServiceStack;
using ServiceStack.Data;
using ServiceStack.OrmLite;

namespace MyApp.Tests;

[Explicit("IntegrationTest")]
public class ComfyAgentTests
{
    private IServiceProvider serviceProvider;

    public ComfyAgentTests()
    {
        Console.WriteLine("UBIXAR_DB_CONNECTION");
        Console.WriteLine(Environment.GetEnvironmentVariable("UBIXAR_DB_CONNECTION"));
        
        var services = new ServiceCollection();
        services.AddOrmLite(options => 
            options.UsePostgres(Environment.GetEnvironmentVariable("UBIXAR_DB_CONNECTION"), 
            dialect => {
            }));

        serviceProvider = services.BuildServiceProvider();
    }
    
    IDbConnection OpenDb() => serviceProvider.GetRequiredService<IDbConnectionFactory>().Open();

    [Test]
    public void Can_Update_RequireNodes()
    {
        var deviceId = "254c87a97e92462ba1c8cd3e49b569c9";
        
        using var db = OpenDb();
        var agent = db.Single<ComfyAgent>(x => x.DeviceId == deviceId);
        agent.RequireNodes = [
            "https://github.com/ltdrdata/ComfyUI-Manager", 
            "https://github.com/pythongosssss/ComfyUI-Custom-Scripts",
            "https://github.com/MoonHugo/ComfyUI-FFmpeg",
        ];
        db.UpdateOnly(() => new ComfyAgent {
            RequireNodes = agent.RequireNodes,
        }, x => x.DeviceId == agent.DeviceId);
    }
}