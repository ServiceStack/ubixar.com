using NUnit.Framework;
using ServiceStack;
using ServiceStack.Jobs;
using ServiceStack.OrmLite;

namespace MyApp.Tests;

[Explicit("Integration tests")]
public class DbJobsTests : DatabaseTestsBase
{
    [Test]
    public void Can_create_DatabaseJobs_Tables()
    {
        // OrmLiteUtils.PrintSql();
        var feature = new DatabaseJobFeature
        {
            DbFactory = DbFactory,
            DbProvider = DbJobsProvider.Create(DbFactory, "jobs"),
            NamedConnection = "jobs",
        };
        
        // feature.DbProvider.DropTables();
        feature.InitSchema();
        
        var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        DateTime[] months =
        [
            startOfMonth.AddMonths(-1),
            startOfMonth,
            startOfMonth.AddMonths(1),
        ];

        foreach (var month in months)
        {
            using var dbMonth = feature.OpenMonthDb(month);
            var completedJobs = dbMonth.Count<CompletedJob>();
            //Assert.That(completedJobs, Is.EqualTo(0));
        }
    }

    [Test]
    public async Task Reset_DatabaseJobs_Tables()
    {
        var dbJobs = DbJobsProvider.Create(DbFactory, "jobs");
        dbJobs.DropTables();
        dbJobs.InitSchema();
    }
}