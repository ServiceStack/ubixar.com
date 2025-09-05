using System.Data;
using System.Diagnostics;
using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.Data;
using ServiceStack.OrmLite;

namespace MyApp.ServiceInterface;

public static class AppDbExtensions
{
    public static void DeleteWorkflowGeneration(this IDbConnection db, string generationId)
    {
        db.DeleteById<WorkflowGeneration>(generationId);
        db.Insert(new DeletedRow { Table = Table.WorkflowGeneration, Key = generationId });
    }
    
    public static void DeleteArtifacts(this IDbConnection db, IEnumerable<int> artifactIds)
    {
        foreach (var artifactId in artifactIds)
        {
            db.DeleteArtifact(artifactId);
        }
    }
    
    public static void DeleteArtifact(this IDbConnection db, int artifactId)
    {
        // Don't need to add ArtifactCategory or ArtifactTag to DeletedRow as it does not need to be synced by clients
        var artifactCategories = db.Select<ArtifactCategory>(x => x.ArtifactId == artifactId);
        if (artifactCategories.Count > 0)
        {
            db.DeleteByIds<ArtifactCategory>(artifactCategories.Map(x => x.Id));
            // db.BulkInsert(artifactCategories.Map(x => new DeletedRow { Table = Table.ArtifactCategory, Key = $"{x.Id}" }));
        }
        var artifactTags = db.Select<ArtifactTag>(x => x.ArtifactId == artifactId);
        if (artifactTags.Count > 0)
        {
            db.DeleteByIds<ArtifactTag>(artifactTags.Map(x => x.Id));
            // db.BulkInsert(artifactTags.Map(x => new DeletedRow { Table = Table.ArtifactTag, Key = $"{x.Id}" }));
        }
        
        db.Delete<ArtifactReaction>(x => x.ArtifactId == artifactId);
        db.Delete<HiddenArtifact>(x => x.ArtifactId == artifactId);
        
        db.DeleteById<Artifact>(artifactId);
        db.Insert(new DeletedRow { Table = Table.Artifact, Key = $"{artifactId}" });
    }

    public static void InsertArtifactCategories(this IDbConnection db, Artifact artifact, AppData appData)
    {
        if (artifact.Categories == null || artifact.Categories.Count == 0) 
            return;

        var artifactCategories = new List<ArtifactCategory>();
        foreach (var artifactCategory in artifact.Categories)
        {
            var category = appData.GetOrCreateCategory(db, artifactCategory.Key);
            artifactCategories.Add(new ArtifactCategory
            {
                ArtifactId = artifact.Id,
                CategoryId = category.Id,
                Score = (int) Math.Round(artifactCategory.Value * 100),
            });
        }
        db.BulkInsert(artifactCategories);
    }

    public static void InsertArtifactTags(this IDbConnection db, Artifact artifact, AppData appData)
    {
        if (artifact.Tags == null || artifact.Tags.Count == 0) 
            return;

        var artifactTags = new List<ArtifactTag>();
        foreach (var artifactTag in artifact.Tags)
        {
            var tag = appData.GetOrCreateTag(db, artifactTag.Key);
            artifactTags.Add(new ArtifactTag
            {
                ArtifactId = artifact.Id,
                TagId = tag.Id,
                Score = (int) Math.Round(artifactTag.Value * 100),
            });
        }
        db.BulkInsert(artifactTags);
    }

    public static string? GetName(this IDbConnection db) => (db as OrmLiteConnection)?.Name;
    public static string? GetDbName(this IDbConnection db) => (db as OrmLiteConnection)?.NamedConnection ?? Workers.AppDb;
    public static string? GetName(this IDbCommand cmd) => (cmd as OrmLiteCommand)?.OrmLiteConnection?.Name;
    public static string? GetDbName(this IDbCommand cmd) => (cmd as OrmLiteCommand)?.OrmLiteConnection?.NamedConnection ?? Workers.AppDb;
    public static TimeSpan? GetElapsedTime(this IDbCommand db) => (db as OrmLiteCommand)?.GetElapsedTime();
    public static IDbConnection OpenWithName(this IDbConnectionFactory dbFactory, string name) =>
        dbFactory.Open(x => x.WithName(name));
}
