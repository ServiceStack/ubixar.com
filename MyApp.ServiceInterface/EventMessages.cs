using MyApp.ServiceModel;
using ServiceStack;

namespace MyApp.ServiceInterface;

public static class EventMessages
{
    public const string Register = nameof(Register);
    public const string CaptionImage = nameof(CaptionImage);
    public const string ExecWorkflow = nameof(ExecWorkflow);
    public const string InstallPipPackage = nameof(InstallPipPackage);
    public const string UninstallPipPackage = nameof(UninstallPipPackage);
    public const string InstallCustomNode = nameof(InstallCustomNode);
    public const string UninstallCustomNode = nameof(UninstallCustomNode);
    public const string DownloadModel = nameof(DownloadModel);
    public const string DeleteModel = nameof(DeleteModel);
    public const string Refresh = nameof(Refresh);
    public const string Reboot = nameof(Reboot);
    public const string ExecOllama = nameof(ExecOllama);
    
    public static AgentEvent ToExecWorkflow(this WorkflowGeneration generation)
    {
        var ret = new AgentEvent
        {
            Name = ExecWorkflow,
            Args = new() {
                ["url"] = Routes.GetGenerationApiPrompt(generation.Id),
            }
        };
        if (generation.Inputs?.Count > 0)
        {
            ret.Args["inputs"] = string.Join(',', generation.Inputs.Select(x => "/files".CombineWith(x)));
        }
        return ret;
    }
}
