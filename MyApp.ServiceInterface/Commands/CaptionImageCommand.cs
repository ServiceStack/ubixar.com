using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.Data;
using ServiceStack.OrmLite;

namespace MyApp.ServiceInterface.Commands;

public class CaptionImageCommand(IDbConnectionFactory dbFactory) : SyncCommandWithResult<OllamaGenerateTask, string>
{
    protected override string Run(OllamaGenerateTask request)
    {
        using var db = dbFactory.OpenWithName(nameof(CaptionImageCommand));
        var artifactId = request.TaskId.ToInt();

        var caption = request.Result.StripQuotes();
        
        var updated = db.UpdateOnly(() => new Artifact {
            Caption = caption,
        }, x => x.Id == artifactId);

        if (updated == 0)
            throw HttpError.NotFound("Artifact not found");

        return caption;
    }
}