using ServiceStack;

namespace MyApp.ServiceModel;

[Tag(Tags.Devices)]
public class QueryAssets : QueryDb<Asset>
{
    [Input(Type = "tag"), FieldCss(Field = "col-span-12")]
    public List<string> FileNames { get; set; }

    [QueryDbField(
        Template="""
                 "Name" LIKE {Value} OR "Description" LIKE {Value} OR "FileName" LIKE {Value} 
                  OR "SavePath" LIKE {Value} OR "Type" LIKE {Value} OR "Base" LIKE {Value}
                 """,
        Field="Name", 
        ValueFormat="%{0}%")
    ]
    public string? Search { get; set; }
    public string? Name { get; set; }
    public string? Type { get; set; }
    public string? Base { get; set; }
    public string? FileName { get; set; }
    public string? Reference { get; set; }
    public string? Url { get; set; }
    public long? Length { get; set; }
    public string? ModifiedBy { get; set; }
    public DateTime? AfterModifiedDate { get; set; }
}

[Tag(Tags.Devices)]
public class FindAssets : IGet, IReturn<FindAssetsResponse> 
{
    [Input(Type = "tag"), FieldCss(Field = "col-span-12")]
    public List<string> Assets { get; set; }
}
public class FindAssetsResponse
{
    public Dictionary<string, string> Results { get; set; } = new();
    public ResponseStatus? ResponseStatus { get; set; }
}


[Tag(Tags.Devices)]
public class FindCustomNodes : IGet, IReturn<FindCustomNodesResponse> 
{
    [Input(Type = "tag"), FieldCss(Field = "col-span-12")]
    public List<string> Types { get; set; }
}
public class FindCustomNodesResponse
{
    public Dictionary<string, string> Results { get; set; } = new();
    public ResponseStatus? ResponseStatus { get; set; }
}

[Tag(Tags.Devices)]
[ValidateIsAuthenticated]
public class InstallPipPackage : IPost, IReturn<StringResponse>
{
    [ValidateNotEmpty, ValidateExactLength(32)]
    public string DeviceId { get; set; }
    [ValidateNotEmpty]
    public string Package { get; set; }
    public bool? Require { get; set; }
}

[Tag(Tags.Devices)]
[ValidateIsAuthenticated]
public class UninstallPipPackage : IPost, IReturn<StringResponse>
{
    [ValidateNotEmpty, ValidateExactLength(32)]
    public string DeviceId { get; set; }
    [ValidateNotEmpty]
    public string Package { get; set; }
}

[Tag(Tags.Devices)]
[ValidateIsAuthenticated]
public class InstallCustomNode : IPost, IReturn<StringResponse>
{
    [ValidateNotEmpty, ValidateExactLength(32)]
    public string DeviceId { get; set; }
    [ValidateNotEmpty]
    public string Url { get; set; }
    public bool? Require { get; set; }
}

[Tag(Tags.Devices)]
[ValidateIsAuthenticated]
public class UninstallCustomNode : IPost, IReturn<StringResponse>
{
    [ValidateNotEmpty, ValidateExactLength(32)]
    public string DeviceId { get; set; }
    [ValidateNotEmpty]
    public string Url { get; set; }
}

[Tag(Tags.Devices)]
[ValidateIsAuthenticated]
public class InstallAsset : IPost, IReturn<StringResponse>
{
    [ValidateNotEmpty, ValidateExactLength(32)]
    public string DeviceId { get; set; }

    [ValidateGreaterThan(0)]
    [Input(Type="lookup", Options = "{refId:'id',model:'Asset',refLabel:'Name'}")]
    public int AssetId { get; set; }

    public bool? Require { get; set; }
}

[Tag(Tags.Devices)]
[ValidateIsAuthenticated]
public class InstallModel : IPost, IReturn<StringResponse>
{
    [ValidateNotEmpty, ValidateExactLength(32)]
    public string DeviceId { get; set; }

    [ValidateNotEmpty]
    public string Url { get; set; }

    [ValidateNotEmpty]
    public string SaveTo { get; set; }

    [ValidateNotEmpty]
    public string FileName { get; set; }

    public string? Token { get; set; }
    public bool? Require { get; set; }
}

[Tag(Tags.Devices)]
[ValidateIsAuthenticated]
public class DeleteModel : IPost, IReturn<StringResponse>
{
    [ValidateNotEmpty, ValidateExactLength(32)]
    public string DeviceId { get; set; }

    [ValidateNotEmpty] 
    public string Path { get; set; }
}

[Tag(Tags.Devices)]
[ValidateIsAuthenticated]
public class RebootAgent : IPost, IReturn<StringResponse>
{
    [ValidateNotEmpty, ValidateExactLength(32)]
    public string DeviceId { get; set; }
}

public enum AgentCommands
{
    Refresh,
    Register,
    Reboot,
}
[Tag(Tags.Devices)]
[ValidateIsAuthenticated]
public class AgentCommand : IPost, IReturn<StringResponse>
{
    [ValidateNotEmpty, ValidateExactLength(32)]
    public string DeviceId { get; set; }
    
    public AgentCommands Command { get; set; }
    
    public Dictionary<string, string>? Args { get; set; }
}

[Tag(Tags.Devices)]
[ValidateIsAuthenticated]
public class GetDeviceStatus : IGet, IReturn<GetDeviceStatusResponse>
{
    [ValidateNotEmpty, ValidateExactLength(32)]
    public string DeviceId { get; set; }
    public bool? Poll { get; set; }
    public string? StatusChanged { get; set; }
}
public class GetDeviceStatusResponse
{
    public string DeviceId { get; set; }
    public DateTime ModifiedDate { get; set; }
    public List<string>? RequirePip { get; set; }
    public List<string>? RequireNodes { get; set; }
    public List<string>? RequireModels { get; set; }
    public List<string>? InstalledPip { get; set; }
    public List<string>? InstalledNodes { get; set; }
    public List<string>? InstalledModels { get; set; }
    public List<string> Nodes { get; set; }
    public Dictionary<string, List<string>> Models { get; set; } = new();
    public List<string>? LanguageModels { get; set; }
    public string? Status { get; set; }
    public string? Logs { get; set; }
    public ResponseStatus? Error { get; set; }

    public ResponseStatus? ResponseStatus { get; set; }
}

[Tag(Tags.Devices)]
[ValidateIsAuthenticated]
public class GetDeviceObjectInfo : IGet, IReturn<string>
{
    [ValidateNotEmpty, ValidateExactLength(32)]
    public string DeviceId { get; set; }
}


[Tag(Tags.Devices)]
// [ValidateIsAuthenticated]
public class GetDeviceStats : IGet, IReturn<QueryResponse<StatTotal>>
{
    [ValidateGreaterThan(0)]
    public int Id { get; set; }
}

public class StatTotal
{
    public string Name { get; set; }
    public int Count { get; set; }
    public int Credits { get; set; }
}
