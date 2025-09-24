using NUnit.Framework;
using ServiceStack;
using ServiceStack.Jobs;
using ServiceStack.OrmLite;

namespace MyApp.Tests;

[Explicit("Integration tests")]
public class DatabaseJobsTests : DatabaseTestsBase
{
    [Test]
    public void Can_create_DatabaseJobs_Tables()
    {
        var feature = new DatabaseJobFeature
        {
            DbFactory = DbFactory,
            DbProvider = DbJobsProvider.Create(DbFactory)
        };
        
        feature.DbProvider.DropTables();
        feature.InitSchema();
        
        using var dbMonth = feature.OpenMonthDb(DateTime.UtcNow);
        var completedJobs = dbMonth.Count<CompletedJob>();
        Assert.That(completedJobs, Is.EqualTo(0));
    }

    [Test]
    public async Task Reset_DatabaseJobs_Tables()
    {
        var dbJobs = DbJobsProvider.Create(DbFactory);
        dbJobs.DropTables();
        dbJobs.InitSchema();
    }
}