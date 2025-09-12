using System.Text.Json.Serialization;
using ServiceStack;
using ServiceStack.DataAnnotations;

namespace MyApp.ServiceModel;

/*
  - http://localhost:7860/api/object_info
  - https://github.com/comfyanonymous/ComfyUI/blob/master/folder_paths.py
  - UNETLoader/input/required/unet_name                   = unet models
  - VAELoader/input/required/vae_name                     = vae models
  - CLIPLoader/input/required/clip_name                   = clip models
  - CLIPVisionLoader/input/required/clip_name             = clip vision models
  - LoraLoader/input/required/lora_name                   = lora models
  - UpscaleModelLoader/input/required/model_name          = upscale models
  - ControlNetLoader/input/required/control_net_name      = control nets
  - StyleModelLoader/input/required/style_model_name      = style moders
  - PhotoMakerLoader/input/required/photomaker_model_name = PhotoMakers
  - GLIGENLoader/input/required/gligen_name               = GLIGENs
  - AssetDownloader/input/required/save_to                = model folders + sub folder
 */
public static class FolderNames
{
    public const string Checkpoints = "checkpoints";
    public const string Clip = "clip";
    public const string ClipVision = "clip_vision";
    public const string Configs = "configs";
    public const string Controlnet = "controlnet";
    public const string Diffusers = "diffusers";
    public const string DiffusionModels = "diffusion_models";
    public const string Embeddings = "embeddings";
    public const string Gligen = "gligen";
    public const string Hypernetworks = "hypernetworks";
    public const string Loras = "loras";
    public const string Photomaker = "photomaker";
    public const string StyleModels = "style_models";
    public const string UpscaleModels = "upscale_models";
    public const string Vae = "vae";
    public const string VaeApprox = "vae_approx";
    public const string Ultralytics = "ultralytics";
    public const string Sams = "sams";
}

[Icon(Svg = Icons.MediaProvider)]
public class ComfyAgent
{
    [AutoIncrement] public int Id { get; set; }
    [Index]
    public string DeviceId { get; set; }
    public int Version { get; set; }
    public string? ComfyVersion { get; set; }
    [Index]
    public string UserId { get; set; }
    public string? UserName { get; set; }
    public string ApiKey { get; set; }
    public List<GpuInfo>? Gpus { get; set; }
    public List<string> Workflows { get; set; }
    public List<string> Nodes { get; set; }

    public Dictionary<string, List<string>> Models { get; set; } = new();
    public List<string>? LanguageModels { get; set; }
    public bool Enabled { get; set; }
    public DateTime? OfflineDate { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime ModifiedDate { get; set; }
    public string? LastIp { get; set; }
    
    public int Credits { get; set; }
    public int WorkflowsExecuted { get; set; }
    public int ImagesGenerated { get; set; }
    public int AudiosGenerated { get; set; }
    public int VideosGenerated { get; set; }
    public int TextsGenerated { get; set; }
    
    public int QueueCount { get; set; }
    
    [PgSqlJsonB]
    public List<string>? RequirePip { get; set; }
    [PgSqlJsonB]
    public List<string>? RequireNodes { get; set; }
    [PgSqlJsonB]
    public List<string>? RequireModels { get; set; }

    [PgSqlJsonB]
    public List<string>? InstalledPip { get; set; }
    [PgSqlJsonB]
    public List<string>? InstalledNodes { get; set; }
    [PgSqlJsonB]
    public List<string>? InstalledModels { get; set; }
    [PgSqlJsonB]
    public Dictionary<string, ModelSettings>? ModelSettings { get; set; }

    [PgSqlJsonB]
    public ComfyAgentConfig Config { get; set; }

    [PgSqlJsonB]
    public ComfyAgentSettings Settings { get; set; }

    public string? Status { get; set; }
    public string? Logs { get; set; }
    public ResponseStatus? Error { get; set; }
    public DateTime? DevicePool { get; set; }

    [Ignore]
    public string ShortId => (DeviceId?[..4] ?? "").ToUpper();

    [Ignore]
    public DateTime LastUpdate { get; set; }

    [Ignore]
    public Dictionary<string, NodeInfo> NodeDefs { get; set; }
    
    /// <summary>
    /// Generation Ids that are running on the Agent
    /// </summary>
    [Ignore]
    public List<string> RunningGenerationIds { get; set; } = [];

    /// <summary>
    /// Generation Ids that are queued on the Agent
    /// </summary>
    [Ignore]
    public List<string> QueuedGenerationIds { get; set; } = [];

    /// <summary>
    /// Generation Ids that are already either queued or running on the Agent (RunningGenerationIds + QueuedGenerationIds)
    /// </summary>
    [Ignore]
    public HashSet<string> QueuedIds { get; set; } = [];

    /// <summary>
    /// The latest version of the agent
    /// </summary>
    long updates;
    [Ignore] public long Updates => Interlocked.Read(ref updates);
    public void SetLastUpdate(DateTime? date=null)
    {
        Interlocked.Increment(ref updates);
        ModifiedDate = LastUpdate = date ?? DateTime.UtcNow;
    }
    
    public List<string> GetModelFiles(string folder)
    {
        var visibleModels = GetVisibleModels();
        if (visibleModels.TryGetValue(folder, out var models))
        {
            return models.OrderBy(x => x).ToList();
        }
        return [];
    }
    
    public bool ContainsFile(string folder, string fileName)
    {
        var visibleModels = GetVisibleModels();
        if (visibleModels.TryGetValue(folder, out var models))
        {
            return models.Contains(fileName);
        }
        return false;
    }
    
    public static bool ContainsFile(Dictionary<string, List<string>> models, string folder, string fileName)
    {
        if (models.TryGetValue(folder, out var files))
        {
            return files.Contains(fileName);
        }
        return false;
    }

    public Dictionary<string, List<string>> GetVisibleModels()
    {
        if (ModelSettings == null || ModelSettings.Count == 0)
            return Models;
        var models = new Dictionary<string, List<string>>();
        foreach (var entry in Models)
        {
            var category = entry.Key;
            var categoryFiles = models.TryGetValue(category, out var files) 
                ? files 
                : [];
            foreach (var file in entry.Value)
            {
                if (ModelSettings.TryGetValue(category + "/" + file, out var settings) && settings.MaxBatchSize == 0)
                    continue;
                categoryFiles.Add(file);
            }
            if (categoryFiles.Count > 0)
            {
                models[category] = categoryFiles;
            }
        }
        return models;
    }
}

public class ModelSettings
{
    public int? MaxBatchSize { get; set; }
}

public class ComfyAgentConfig
{
    public bool? InstallModels { get; set; }
    public bool? InstallNodes { get; set; }
    public bool? InstallPackages { get; set; }
}

public class ComfyAgentSettings
{
    public bool InDevicePool { get; set; }
    public bool PreserveOutputs { get; set; }
    
    public static ComfyAgentSettings CreateDefault() => new()
    {
        InDevicePool = false,
        PreserveOutputs = false,
    };
}

public class NodeInfo
{
    // required/optional/hidden -> inputName -> definition
    [JsonPropertyName("input")] public Dictionary<string, Dictionary<string, NodeInputDefinition>>? Input { get; set; }

    [JsonPropertyName("input_order")] public NodeInputOrder? InputOrder { get; set; }

    [JsonPropertyName("name")] public string Name { get; set; } = ""; // Class type
    // Other properties like output, display_name, category are not strictly needed for prompt conversion

    public NodeInputDefinition? GetInput(string name)
    {
        if (Input == null)
            return null;
        foreach (var entry in Input)
        {
            if (entry.Value.TryGetValue(name, out var inputDef))
            {
                return inputDef;
            }
        }
        return null; 
    }
}

public class NodeInputOrder
{
    [JsonPropertyName("required")] public List<string>? Required { get; set; }

    [JsonPropertyName("optional")] public List<string>? Optional { get; set; }

    [JsonPropertyName("hidden")] public List<string>? Hidden { get; set; }

    // Combine all input names in order
    public List<string> GetAllInputNamesInOrder()
    {
        var names = new List<string>();
        if (Required != null) names.AddRange(Required);
        if (Optional != null) names.AddRange(Optional);
        if (Hidden != null) names.AddRange(Hidden);
        return names;
    }
}

public class NodeInputDefinition
{
    // In object_info.json, input definitions are arrays with two elements:
    // ["MODEL", {"tooltip": "..."}] or [["option1", "option2"], {"default": "option1"}]
    public ComfyInputType Type { get; set; }
    public Dictionary<string, object>? Options { get; set; }
    public string[]? EnumValues { get; set; }
    public Dictionary<string, object>? ComboValues { get; set; }
    // Special case for seed where it captures 2 widget_values, but is not included in the API prompt
    public bool? ControlAfterGenerate { get; set; }
}
