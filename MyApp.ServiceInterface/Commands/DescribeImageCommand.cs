using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.Data;
using ServiceStack.OrmLite;

namespace MyApp.ServiceInterface.Commands;

public class DescribeImageCommand(IDbConnectionFactory dbFactory) : SyncCommand<OllamaGenerateTask>
{
    protected override void Run(OllamaGenerateTask request)
    {
        using var db = dbFactory.OpenWithName(nameof(DescribeImageCommand));
        var artifactId = request.TaskId.ToInt();
        var updated = db.UpdateOnly(() => new Artifact {
            Description = request.Result,
        }, x => x.Id == artifactId);

        if (updated == 0)
            throw HttpError.NotFound("Artifact not found");
    }
}
