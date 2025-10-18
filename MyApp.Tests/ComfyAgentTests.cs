using Microsoft.Extensions.DependencyInjection;
using MyApp.ServiceModel;
using NUnit.Framework;
using ServiceStack.Data;
using ServiceStack.OrmLite;

namespace MyApp.Tests;

[Explicit("IntegrationTest")]
public class ComfyAgentTests : DatabaseTestsBase
{
    [Test]
    public void Can_get_agent()
    {
        var deviceId = "d09bee1cb0cc4df0984d35b052e8df18";
        
        using var db = OpenDb();
        var agent = db.Single<ComfyAgent>(x => x.DeviceId == deviceId);
        Assert.That(agent, Is.Not.Null);
    }
}