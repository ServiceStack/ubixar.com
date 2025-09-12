using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using ServiceStack;
using MyApp.ServiceModel;
using ServiceStack.Text;

namespace MyApp.ServiceInterface;

public class ComfyWorkflowParser
{
    private static List<Dictionary<string, object?>> GetWorkflowNodes(Dictionary<string, object?> workflow, ILogger? log = null)
    {
        if (workflow["nodes"] is not List<object> nodesObj)
        {
            log?.LogError("No nodes found in workflow JSON");
            throw new Exception("No nodes found in workflow JSON");
        }
        return nodesObj.Map(x => (Dictionary<string, object?>)x);
    }

    public static HashSet<string> IgnoreClientNodes { get; } =
    [
        "Note",
        "MarkdownNote",
        "Reroute",
        "PrimitiveNode",
    ];

    public static HashSet<string> ExtractRequiredNodeTypes(Dictionary<string, object?> workflow, ILogger? log = null)
    {
        return ExtractRequiredNodeTypes(workflow, IgnoreClientNodes, log);
    }
    
    public static HashSet<string> ExtractRequiredNodeTypes(Dictionary<string, object?> workflow, HashSet<string> ignoreNodes, ILogger? log = null)
    {
        var workflowNodes = ExtractNodeTypes(workflow, log);
        foreach (var node in ignoreNodes.Union(IgnoreClientNodes))
        {
            workflowNodes.Remove(node);
        }

        return workflowNodes;
    }
    
    static HashSet<string> ExtractNodeTypes(Dictionary<string, object?> workflow, ILogger? log = null)
    {
        log ??= NullLogger.Instance;
        var ret = new HashSet<string>();

        var nodes = GetWorkflowNodes(workflow, log);
        foreach (var node in nodes)
        {
            if (node.GetValueOrDefault("type") is string nodeType)
            {
                ret.Add(nodeType);
            }
        }
        return ret;
    }

    public static HashSet<string> ExtractRequiredPackages(Dictionary<string, object?> workflow, ILogger? log = null)
    {
        log ??= NullLogger.Instance;
        var ret = new HashSet<string>();
        
        var nodes = GetWorkflowNodes(workflow, log);
        foreach (var node in nodes)
        {
            if (node.GetValueOrDefault("type") is not string nodeType)
                continue;
            if (nodeType == "RequiresPipPackage")
            {
                if (node["widgets_values"] is List<object> { Count: >= 1 } widgetValues)
                {
                    ret.Add(widgetValues[0].ToString()!);
                }
            }
        }
        return ret;
    }

    public static HashSet<string> ExtractRequiresCustomNodeUrls(Dictionary<string, object?> workflow, ILogger? log = null)
    {
        log ??= NullLogger.Instance;
        var ret = new HashSet<string>();
        
        var nodes = GetWorkflowNodes(workflow, log);
        foreach (var node in nodes)
        {
            if (node.GetValueOrDefault("type") is not string nodeType)
                continue;
            if (nodeType == "RequiresCustomNode")
            {
                if (node["widgets_values"] is List<object> { Count: >= 1 } widgetValues)
                {
                    ret.Add(widgetValues[0].ToString()!);
                }
            }
        }
        return ret;
    }
    
    public static HashSet<string> ExtractAssetPaths(Dictionary<string,object?> workflow, ILogger? log = null)
    {
        log ??= NullLogger.Instance;
        var ret = new HashSet<string>();

        var nodes = GetWorkflowNodes(workflow, log);
        foreach (var node in nodes)
        {
            if (node.GetValueOrDefault("type") is not string nodeType) 
                continue;

            //https://github.com/comfyanonymous/ComfyUI/blob/master/folder_paths.py
            if (nodeType is "CheckpointLoaderSimple" 
                or "CheckpointLoader" 
                or "unCLIPCheckpointLoader" 
                or "ImageOnlyCheckpointLoader" 
                or "CreateHookModelAsLora" 
                or "CreateHookModelAsLoraModelOnly" 
                or "CheckpointLoader|pysssss"
                or "Checkpoint Loader with Name (Image Saver)" // comfyui-image-saver 
                )
            {
                var widgetValueIndex = nodeType == "CheckpointLoader" ? 1 : 0;
                if (node["widgets_values"] is List<object> { Count: >= 1 } widgetValues)
                {
                    ret.Add("checkpoints/" + widgetValues[widgetValueIndex]);
                }
            }
            else if (nodeType is "VAELoader")
            {
                if (node["widgets_values"] is List<object> { Count: >= 1 } widgetValues)
                {
                    ret.Add("vae/" + widgetValues[0]);
                }
            }
            else if (nodeType is "CLIPLoader")
            {
                if (node["widgets_values"] is List<object> { Count: >= 1 } widgetValues)
                {
                    ret.Add("clip/" + widgetValues[0]);
                }
            }
            else if (nodeType is "DualCLIPLoader")
            {
                if (node["widgets_values"] is List<object> { Count: >= 2 } widgetValues)
                {
                    ret.Add("clip/" + widgetValues[0]);
                    ret.Add("clip/" + widgetValues[1]);
                }
            }
            else if (nodeType is "TripleCLIPLoader")
            {
                if (node["widgets_values"] is List<object> { Count: >= 3 } widgetValues)
                {
                    ret.Add("clip/" + widgetValues[0]);
                    ret.Add("clip/" + widgetValues[1]);
                    ret.Add("clip/" + widgetValues[2]);
                }
            }
            else if (nodeType is "QuadrupleCLIPLoader")
            {
                if (node["widgets_values"] is List<object> { Count: >= 4 } widgetValues)
                {
                    ret.Add("clip/" + widgetValues[0]);
                    ret.Add("clip/" + widgetValues[1]);
                    ret.Add("clip/" + widgetValues[2]);
                    ret.Add("clip/" + widgetValues[3]);
                }
            }
            else if (nodeType is "CLIPVisionLoader")
            {
                if (node["widgets_values"] is List<object> { Count: >= 1 } widgetValues)
                {
                    ret.Add("clip_vision/" + widgetValues[0]);
                }
            }
            else if (nodeType is "UNETLoader")
            {
                if (node["widgets_values"] is List<object> { Count: >= 1 } widgetValues)
                {
                    ret.Add("diffusion_models/" + widgetValues[0]);
                }
            }
            else if (nodeType is "LoraLoader")
            {
                if (node["widgets_values"] is List<object> { Count: >= 1 } widgetValues)
                {
                    ret.Add("loras/" + widgetValues[0]);
                }
            }
            else if (nodeType is "UpscaleModelLoader")
            {
                if (node["widgets_values"] is List<object> { Count: >= 1 } widgetValues)
                {
                    ret.Add("upscale_models/" + widgetValues[0]);
                }
            }
            else if (nodeType is "ControlNetLoader")
            {
                if (node["widgets_values"] is List<object> { Count: >= 1 } widgetValues)
                {
                    ret.Add("controlnet/" + widgetValues[0]);
                }
            }
            else if (nodeType is "StyleModelLoader")
            {
                if (node["widgets_values"] is List<object> { Count: >= 1 } widgetValues)
                {
                    ret.Add("style_models/" + widgetValues[0]);
                }
            }
            else if (nodeType is "PhotoMakerLoader")
            {
                if (node["widgets_values"] is List<object> { Count: >= 1 } widgetValues)
                {
                    ret.Add("photomaker/" + widgetValues[0]);
                }
            }
            else if (nodeType is "GLIGENLoader")
            {
                if (node["widgets_values"] is List<object> { Count: >= 1 } widgetValues)
                {
                    ret.Add("gligen/" + widgetValues[0]);
                }
            }
            else if (nodeType is "AssetDownloader" or "RequiresAsset")
            {
                if (node["widgets_values"] is List<object> { Count: >= 3 } widgetValues)
                {
                    ret.Add(widgetValues[1].ToString().CombineWith(widgetValues[2]));
                }
            }
        }
        return ret;
    }
    
    public static WorkflowInfo Parse(Dictionary<string,object?> workflow, string workflowName, Dictionary<string, NodeInfo> nodeDefs, ILogger? log = null)
    {
        log ??= NullLogger.Instance;
        if (workflow["nodes"] is not List<object> nodesObj || workflow["links"] is not List<object> links)
            throw new ArgumentException("Invalid workflow JSON");

        var nodes = nodesObj.Map(x => (Dictionary<string, object?>)x);

        void IfNodeType(string nodeType, int minWidgetValues, Action<Dictionary<string, object?>, List<object>> action)
        {
            var node = nodes.FirstOrDefault(n => n["type"] is string s && s == nodeType);
            if (node != null)
            {
                var mode = node["mode"]?.ConvertTo<int>() ?? 0;
                // ALWAYS = 0,
                // Ignore modes:
                // ON_EVENT = 1,
                // NEVER = 2,
                // ON_TRIGGER = 3,
                // BYPASS = 4
                if (mode != 0) 
                    return;
                
                if (node["widgets_values"] is List<object> widgetValues && widgetValues.Count >= minWidgetValues)
                {
                    action(node, widgetValues);
                }
            }
        }

        var workflowInfo = CreateWorkflowInfo(workflowName, nodes);

        var inputs = new List<ComfyInputDefinition>();
        inputs.AddRange(GetPromptInputs(nodes, links));

        IfNodeType("TextEncodeAceStepAudio", 1, (node, widgetValues) => {
            var positivePrompt = inputs
                .FirstOrDefault(i => i is { Name: "positivePrompt", ClassType: "TextEncodeAceStepAudio" });
            if (positivePrompt != null)
            {
                positivePrompt.Name = "tags";
                positivePrompt.Label = "Tags";
                positivePrompt.Tooltip = "Tags to be encoded for positive conditioning and music styles";
            }

            var nodeId = Convert.ToInt32(node["id"]);
            inputs.Add(new ComfyInputDefinition
            {
                ClassType = "TextEncodeAceStepAudio",
                NodeId = nodeId,
                ValueIndex = 1,
                Name = "lyrics",
                Label = "Lyrics",
                Type = ComfyInputType.String,
                Tooltip = "Corresponding lyrics",
                Multiline = true,
                Default = GetNodeWidgetValue(nodes, nodeId, 1)
            });
            inputs.Add(new ComfyInputDefinition
            {
                ClassType = "TextEncodeAceStepAudio",
                NodeId = nodeId,
                ValueIndex = 2,
                Name = "lyrics_strength",
                Label = "Lyrics Strength",
                Type = ComfyInputType.Float,
                Tooltip = "Corresponding lyrics",
                Multiline = true,
                Default = GetNodeWidgetValue(nodes, nodeId, 2) ?? 1,
                Min = 0,
                Max = 10,
                Step = 0.01m,
            });
        });

        var loadCheckpointNode = nodes.FirstOrDefault(n => n["type"]?.ToString() is
            "CheckpointLoaderSimple" or "unCLIPCheckpointLoader" or "CheckpointLoader" or "ImageOnlyCheckpointLoader" or
            "CreateHookModelAsLora" or "CreateHookModelAsLoraModelOnly" or "CheckpointLoader|pysssss");
        if (loadCheckpointNode != null)
        {
            if (loadCheckpointNode["widgets_values"] is List<object> { Count: >= 7 } widgetValues)
            {
                var nodeType = loadCheckpointNode["type"]!.ToString();
                var nodeId = Convert.ToInt32(loadCheckpointNode["id"]);
                inputs.Add(new ComfyInputDefinition
                {
                    ClassType = nodeType,
                    NodeId = nodeId,
                    ValueIndex = nodeType == "CheckpointLoader" // [config_name,ckpt_name]
                        ? 1
                        : 0,
                    Name = "ckpt_name",
                    Label = "Model",
                    Type = ComfyInputType.String,
                    Default = widgetValues[0],
                    Tooltip = "The name of the checkpoint (model) to load.",
                });
            }
        }

        // Extract sampling parameters from KSampler node
        var kSamplerNode = nodes.FirstOrDefault(n => n["type"] is "KSampler");
        var samplerCustomNode = nodes.FirstOrDefault(n => n["type"] is "SamplerCustom");
        
        if (kSamplerNode != null)
        {
            if (kSamplerNode["widgets_values"] is List<object> { Count: >= 7 } widgetValues)
            {
                nodeDefs.TryGetValue("KSampler", out var nodeDef);
                var nodeId = Convert.ToInt32(kSamplerNode["id"]);

                inputs.Add(new ComfyInputDefinition
                {
                    ClassType = "KSampler",
                    NodeId = nodeId,
                    ValueIndex = 0,
                    Name = "seed",
                    Label = "Seed",
                    Type = ComfyInputType.Int,
                    Default = widgetValues[0],
                    Min = 0,
                    Max = 18446744073709551615m,
                    ControlAfterGenerate = true,
                    Tooltip = "The random seed used for creating the noise.",
                });
                inputs.Add(new ComfyInputDefinition
                {
                    ClassType = "KSampler",
                    NodeId = nodeId,
                    ValueIndex = 2,
                    Name = "steps",
                    Label = "Steps",
                    Type = ComfyInputType.Int,
                    Default = Convert.ToInt32(widgetValues[2]),
                    Min = 1,
                    Max = 10000,
                    Tooltip = "The number of steps used in the denoising process.",
                });
                inputs.Add(new ComfyInputDefinition
                {
                    ClassType = "KSampler",
                    NodeId = nodeId,
                    ValueIndex = 3,
                    Name = "cfg",
                    Label = "CFG Scale",
                    Type = ComfyInputType.Float,
                    Default = Convert.ToDecimal(widgetValues[3]),
                    Min = 0,
                    Max = 100,
                    Step = 0.1m,
                    Round = 0.01m,
                    Tooltip = "The Classifier-Free Guidance scale balances creativity and adherence to the prompt. Higher values result in images more closely matching the prompt however too high values will negatively impact quality.",
                });

                var samplerNames = nodeDef?.Input.GetValueOrDefault("required").GetValueOrDefault("sampler_name")?.EnumValues ?? [];
                if (samplerNames.Length == 0)
                    log.LogWarning("No sampler names found in '{Node}' node definition", "KSampler");
                inputs.Add(new ComfyInputDefinition
                {
                    ClassType = "KSampler",
                    NodeId = nodeId,
                    ValueIndex = 4,
                    Name = "sampler_name",
                    Label = "Sampler",
                    Type = ComfyInputType.Enum,
                    Default = widgetValues[4],
                    EnumValues = samplerNames,
                    Tooltip = "The algorithm used when sampling, this can affect the quality, speed, and style of the generated output.",
                });

                var schedulerNames = nodeDef?.Input.GetValueOrDefault("required").GetValueOrDefault("scheduler")?.EnumValues ?? [];
                if (schedulerNames.Length == 0)
                    log.LogWarning("No scheduler names found in '{Node}' node definition", "KSampler");
                inputs.Add(new ComfyInputDefinition
                {
                    ClassType = "KSampler",
                    NodeId = nodeId,
                    ValueIndex = 5,
                    Name = "scheduler",
                    Label = "Scheduler",
                    Type = ComfyInputType.Enum,
                    Default = widgetValues[5],
                    EnumValues = schedulerNames,
                    Tooltip = "The scheduler controls how noise is gradually removed to form the image.",
                });
                inputs.Add(new ComfyInputDefinition
                {
                    ClassType = "KSampler",
                    NodeId = nodeId,
                    ValueIndex = 6,
                    Name = "denoise",
                    Label = "Denoise",
                    Type = ComfyInputType.Float,
                    Default = Convert.ToDecimal(widgetValues[6]),
                    Min = 0,
                    Max = 1,
                    Step = 0.01m,
                    Tooltip = "The amount of denoising applied, lower values will maintain the structure of the initial image allowing for image to image sampling.",
                });
            }
        }
        else
        {
            if (samplerCustomNode?["widgets_values"] is List<object> { Count: >= 4 } widgetValues)
            {
                nodeDefs.TryGetValue("SamplerCustom", out var nodeDef);
                var nodeId = Convert.ToInt32(samplerCustomNode["id"]);

                inputs.Add(new ComfyInputDefinition
                {
                    ClassType = "SamplerCustom",
                    NodeId = nodeId,
                    ValueIndex = 1,
                    Name = "noise_seed",
                    Label = "Seed",
                    Type = ComfyInputType.Int,
                    Default = widgetValues[1],
                    Min = 0,
                    Max = 18446744073709551615m,
                    ControlAfterGenerate = true,
                    Tooltip = "The random seed used for creating the noise.",
                });
                inputs.Add(new ComfyInputDefinition
                {
                    ClassType = "SamplerCustom",
                    NodeId = nodeId,
                    ValueIndex = 3,
                    Name = "cfg",
                    Label = "CFG Scale",
                    Type = ComfyInputType.Float,
                    Default = Convert.ToDecimal(widgetValues[3]),
                    Min = 0,
                    Max = 100,
                    Step = 0.1m,
                    Round = 0.01m,
                    Tooltip = "The Classifier-Free Guidance scale balances creativity and adherence to the prompt. Higher values result in images more closely matching the prompt however too high values will negatively impact quality.",
                });
            }
        }

        IfNodeType("LoadImage", 1, (node, widgetValues) => {
            inputs.Add(new ComfyInputDefinition {
                ClassType = "LoadImage",
                NodeId = Convert.ToInt32(node["id"]),
                ValueIndex = 0,
                Name = "image",
                Label = "Image",
                Type = ComfyInputType.Image,
                Tooltip = "Select Image",
                Upload = true,
            });
        });
        
        IfNodeType("LoadAudio", 1, (node, widgetValues) => {
            inputs.Add(new ComfyInputDefinition {
                ClassType = "LoadAudio",
                NodeId = Convert.ToInt32(node["id"]),
                ValueIndex = 0,
                Name = "audio",
                Label = "Audio",
                Type = ComfyInputType.Audio,
                Tooltip = "Select Audio",
                Upload = true,
            });
        });
        
        IfNodeType("LoadVideo", 1, (node, widgetValues) => {
            inputs.Add(new ComfyInputDefinition {
                ClassType = "LoadVideo",
                NodeId = Convert.ToInt32(node["id"]),
                ValueIndex = 0,
                Name = "video",
                Label = "Video",
                Type = ComfyInputType.Video,
                Tooltip = "Select Video",
                Upload = true,
            });
        });
        
        IfNodeType("TT-LoadAudio", 1, (node, widgetValues) => {
            inputs.Add(new ComfyInputDefinition {
                ClassType = "TT-LoadAudio",
                NodeId = Convert.ToInt32(node["id"]),
                ValueIndex = 0,
                Name = "audio",
                Label = "Audio",
                Type = ComfyInputType.Audio,
                Tooltip = "Select Audio",
                Upload = true,
            });
        });

        IfNodeType("TT-LoadVideoAudio", 1, (node, widgetValues) => {
            inputs.Add(new ComfyInputDefinition {
                ClassType = "TT-LoadVideoAudio",
                NodeId = Convert.ToInt32(node["id"]),
                ValueIndex = 0,
                Name = "video",
                Label = "Video",
                Type = ComfyInputType.Enum,
                Tooltip = "Select Video",
                Upload = true,
            });
        });
        
        IfNodeType("VibeVoiceSingleSpeakerNode", 10, (node, widgetValues) =>
        {
            var nodeType = "VibeVoiceSingleSpeakerNode";
            var nodeId = Convert.ToInt32(node["id"]);
            inputs.Add(new ComfyInputDefinition
            {
                ClassType = nodeType,
                NodeId = nodeId,
                ValueIndex = 0,
                Name = "text",
                Label = "Text",
                Type = ComfyInputType.String,
                Tooltip = "Text to convert to speech. Gets disabled when connected to another node.",
                Placeholder = "Text to convert to speech",
                Multiline = true,
                Default = widgetValues[0]
            });
            inputs.Add(new ComfyInputDefinition
            {
                ClassType = nodeType,
                NodeId = nodeId,
                ValueIndex = 4,
                Name = "diffusion_steps",
                Label = "Diffusion Steps",
                Type = ComfyInputType.Int,
                Default = Convert.ToInt32(widgetValues[4]),
                Min = 5,
                Max = 100,
                Tooltip = "The number of steps used in the denoising process.",
            });
            inputs.Add(new ComfyInputDefinition
            {
                ClassType = nodeType,
                NodeId = nodeId,
                ValueIndex = 5,
                Name = "seed",
                Label = "Seed",
                Type = ComfyInputType.Int,
                Default = widgetValues[5],
                Min = 0,
                Max = 4294967295,
                ControlAfterGenerate = true,
                Tooltip = "Random seed for generation. Default 42 is used in official examples.",
            });
            inputs.Add(new ComfyInputDefinition
            {
                ClassType = nodeType,
                NodeId = nodeId,
                ValueIndex = 7,
                Name = "cfg_scale",
                Label = "CFG Scale",
                Type = ComfyInputType.Float,
                Default = Convert.ToDecimal(widgetValues[7]),
                Min = 1,
                Max = 2,
                Step = 0.05m,
                Round = 0.01m,
                Tooltip = "Classifier-free guidance scale (official default: 1.3)",
            });
            inputs.Add(new ComfyInputDefinition
            {
                ClassType = nodeType,
                NodeId = nodeId,
                ValueIndex = 9,
                Name = "temperature",
                Label = "Temperature",
                Type = ComfyInputType.Float,
                Default = Convert.ToDecimal(widgetValues[9]),
                Min = 1,
                Max = 2,
                Step = 0.05m,
                Round = 0.01m,
                Tooltip = "Only used when sampling is enabled",
            });
            inputs.Add(new ComfyInputDefinition
            {
                ClassType = nodeType,
                NodeId = nodeId,
                ValueIndex = 10,
                Name = "top_p",
                Label = "Top P",
                Type = ComfyInputType.Float,
                Default = Convert.ToDecimal(widgetValues[10]),
                Min = 1,
                Max = 2,
                Step = 0.05m,
                Round = 0.01m,
                Tooltip = "Only used when sampling is enabled",
            });
        });

        foreach (var node in nodes)
        {
            if (node.GetValueOrDefault("type") is not string nodeType) 
                continue;

            var nodeId = Convert.ToInt32(node["id"]);
            nodeDefs.TryGetValue(nodeType, out var nodeDef);

            if (nodeType is "EmptyLatentImage" or "EmptySD3LatentImage")
            {
                // Extract dimensions from EmptyLatentImage node
                if (node["widgets_values"] is List<object> { Count: >= 3 } widgetValues)
                {
                    inputs.Add(new ComfyInputDefinition
                    {
                        ClassType = nodeType,
                        NodeId = nodeId,
                        ValueIndex = 0,
                        Name = "width",
                        Label = "Width",
                        Type = ComfyInputType.Int,
                        Default = Convert.ToInt32(widgetValues[0]),
                        Min = 16,
                        Max = 16384,
                        Step = 8,
                        Tooltip = "The width of the latent images in pixels.",
                    });
                    inputs.Add(new ComfyInputDefinition
                    {
                        ClassType = nodeType,
                        NodeId = nodeId,
                        ValueIndex = 1,
                        Name = "height",
                        Label = "Height",
                        Type = ComfyInputType.Int,
                        Default = Convert.ToInt32(widgetValues[1]),
                        Min = 16,
                        Max = 16384,
                        Step = 8,
                        Tooltip = "The height of the latent images in pixels.",
                    });
                    inputs.Add(new ComfyInputDefinition
                    {
                        ClassType = nodeType,
                        NodeId = nodeId,
                        ValueIndex = 2,
                        Name = "batch_size",
                        Label = "Image Count",
                        Type = ComfyInputType.Int,
                        Default = Convert.ToInt32(widgetValues[2]),
                        Min = 1,
                        Max = 4096,
                        Tooltip = "The number of latent images in the batch.",
                    });
                }
            }
            else if (nodeType is "EmptyLatentAudio" or "EmptyAceStepLatentAudio")
            {
                if (node["widgets_values"] is List<object> { Count: >= 2 } widgetValues)
                {
                    // Add seconds
                    inputs.Add(new ComfyInputDefinition
                    {
                        ClassType = nodeType,
                        NodeId = nodeId,
                        ValueIndex = 0,
                        Name = "seconds",
                        Label = "Duration",
                        Type = ComfyInputType.Float,
                        Default = Convert.ToInt32(widgetValues[0]),
                        Min = 1,
                        Max = 1000,
                        Step = 0.1m,
                    });

                    inputs.Add(new ComfyInputDefinition
                    {
                        ClassType = nodeType,
                        NodeId = nodeId,
                        ValueIndex = 1,
                        Name = "batch_size",
                        Label = "Audio Count",
                        Type = ComfyInputType.Int,
                        Default = Convert.ToInt32(widgetValues[1]),
                        Min = 1,
                        Max = 4096,
                        Tooltip = "The number of latent audio in the batch.",
                    });
                }
            }
            else if (nodeType == "RandomNoise")
            {
                if (node["widgets_values"] is List<object> { Count: >= 2 } widgetValues)
                {
                    inputs.Add(new ComfyInputDefinition
                    {
                        ClassType = nodeType,
                        NodeId = nodeId,
                        ValueIndex = 0,
                        Name = "noise_seed",
                        Label = "Seed",
                        Type = ComfyInputType.Int,
                        Default = widgetValues[0],
                        Min = 0,
                        Max = 18446744073709551615m,
                        ControlAfterGenerate = true,
                        Tooltip = "The random seed used for creating the noise.",
                    });
                }
            }
            else if (nodeType == "KSamplerSelect")
            {
                if (node["widgets_values"] is List<object> { Count: >= 1 } widgetValues)
                {
                    var samplerNames = nodeDef?.Input.GetValueOrDefault("required").GetValueOrDefault("sampler_name")?.EnumValues ?? [];
                    if (samplerNames.Length == 0)
                        log.LogWarning("No '{InputName}' found in '{Node}' node definition", "sampler_name", nodeType);

                    inputs.Add(new ComfyInputDefinition
                    {
                        ClassType = nodeType,
                        NodeId = nodeId,
                        ValueIndex = 0,
                        Name = "sampler_name",
                        Label = "Sampler",
                        Type = ComfyInputType.Enum,
                        Default = widgetValues[0],
                        EnumValues = samplerNames,
                        Tooltip = "The algorithm used when sampling, this can affect the quality, speed, and style of the generated output.",
                    });
                }
            }
            else if (nodeType == "SDTurboScheduler")
            {
                if (node["widgets_values"] is List<object> { Count: >= 2 } widgetValues)
                {
                    inputs.Add(new ComfyInputDefinition
                    {
                        ClassType = nodeType,
                        NodeId = nodeId,
                        ValueIndex = 0,
                        Name = "steps",
                        Label = "Steps",
                        Type = ComfyInputType.Int,
                        Default = Convert.ToInt32(widgetValues[0]),
                        Min = 1,
                        Max = 10000,
                        Tooltip = "The number of steps used in the denoising process.",
                    });
                    inputs.Add(new ComfyInputDefinition
                    {
                        ClassType = nodeType,
                        NodeId = nodeId,
                        ValueIndex = 1,
                        Name = "denoise",
                        Label = "Denoise",
                        Type = ComfyInputType.Float,
                        Default = Convert.ToDecimal(widgetValues[1]),
                        Min = 0,
                        Max = 1,
                        Step = 0.01m,
                        Tooltip = "The amount of denoising applied, lower values will maintain the structure of the initial image allowing for image to image sampling.",
                    });
                }
            }
            else if (nodeType == "BasicScheduler")
            {
                if (node["widgets_values"] is List<object> { Count: >= 3 } widgetValues)
                {
                    var schedulerNames = nodeDef?.Input.GetValueOrDefault("required").GetValueOrDefault("scheduler")?.EnumValues ?? [];
                    if (schedulerNames.Length == 0)
                        log.LogWarning("No '{InputName}' found in '{Node}' node definition", "scheduler", nodeType);

                    inputs.Add(new ComfyInputDefinition
                    {
                        ClassType = nodeType,
                        NodeId = nodeId,
                        ValueIndex = 0,
                        Name = "scheduler",
                        Label = "Scheduler",
                        Type = ComfyInputType.Enum,
                        Default = widgetValues[0],
                        EnumValues = schedulerNames,
                        Tooltip = "The scheduler controls how noise is gradually removed to form the image.",
                    });
                    inputs.Add(new ComfyInputDefinition
                    {
                        ClassType = nodeType,
                        NodeId = nodeId,
                        ValueIndex = 1,
                        Name = "steps",
                        Label = "Steps",
                        Type = ComfyInputType.Int,
                        Default = Convert.ToInt32(widgetValues[1]),
                        Min = 1,
                        Max = 10000,
                        Tooltip = "The number of steps used in the denoising process.",
                    });
                    inputs.Add(new ComfyInputDefinition
                    {
                        ClassType = nodeType,
                        NodeId = nodeId,
                        ValueIndex = 2,
                        Name = "denoise",
                        Label = "Denoise",
                        Type = ComfyInputType.Float,
                        Default = Convert.ToDecimal(widgetValues[2]),
                        Min = 0,
                        Max = 1,
                        Step = 0.01m,
                        Tooltip = "The amount of denoising applied, lower values will maintain the structure of the initial image allowing for image to image sampling.",
                    });
                }
            }
            else if (nodeType == "Florence2Run")
            {
                if (node["widgets_values"] is List<object> { Count: >= 3 } widgetValues)
                {
                    inputs.Add(new ComfyInputDefinition
                    {
                        ClassType = nodeType,
                        NodeId = nodeId,
                        ValueIndex = 0,
                        Name = "text_input",
                        Label = "Text Input",
                        Type = ComfyInputType.String,
                        Default = widgetValues[0],
                    });

                    var tasks = nodeDef?.Input.GetValueOrDefault("required").GetValueOrDefault("task")?.EnumValues ?? [];
                    if (tasks.Length == 0)
                        log.LogWarning("No '{InputName}' found in '{Node}' node definition", "task", nodeType);

                    inputs.Add(new ComfyInputDefinition
                    {
                        ClassType = nodeType,
                        NodeId = nodeId,
                        ValueIndex = 1,
                        Name = "task",
                        Label = "Task",
                        Type = ComfyInputType.Enum,
                        Default = widgetValues[1],
                        EnumValues = tasks,
                    });
                    inputs.Add(new ComfyInputDefinition
                    {
                        ClassType = nodeType,
                        NodeId = nodeId,
                        ValueIndex = 2,
                        Name = "fill_mask",
                        Label = "Fill Mask",
                        Type = ComfyInputType.Boolean,
                        Default = widgetValues[2],
                    });
                }
            }
            else if (nodeType is "AssetDownloader" or "RequiresAsset")
            {
                if (node["widgets_values"] is List<object> { Count: >= 3 } widgetValues)
                {
                    var url = widgetValues[0].ToString();
                    var token = widgetValues[3].ToString();
                    if (!string.IsNullOrEmpty(token))
                        url = $"{token}@{url}";
                    var asset = widgetValues[1].ToString().CombineWith(widgetValues[2]);
                    if (!string.IsNullOrEmpty(asset) && !string.IsNullOrEmpty(url))
                    {
                        workflowInfo.Assets.Add(new AssetInfo
                        {
                            Asset = asset,
                            Url = url,
                        });
                    }
                }
            }
            else if (nodeType == "RequiresCustomNode")
            {
                if (node["widgets_values"] is List<object> { Count: >= 1 } widgetValues)
                {
                    var repo = widgetValues[0].ToString();
                    if (!string.IsNullOrEmpty(repo))
                    {
                        workflowInfo.CustomNodes.Add(repo);
                    }
                }
            }
            else if (nodeType == "RequiresPipPackage")
            {
                if (node["widgets_values"] is List<object> { Count: >= 1 } widgetValues)
                {
                    var package = widgetValues[0].ToString();
                    if (!string.IsNullOrEmpty(package))
                    {
                        workflowInfo.PipPackages.Add(package);
                    }
                }
            }
        }

        workflowInfo.Inputs = inputs;
        return workflowInfo;
    }

    // Rules for determining workflow input type 
    public static List<(string[], ComfyPrimarySource)> InputSourceMappings { get; set; } =
    [
        (["LoadImage"], ComfyPrimarySource.Image),
        (["TextEncodeAceStepAudio"], ComfyPrimarySource.Text),
        (["LoadAudio","TT-LoadAudio"], ComfyPrimarySource.Audio),
        (["LoadVideo","TT-LoadVideoAudio"], ComfyPrimarySource.Video),
        (["CLIPTextEncode", "CLIPTextEncodeSDXL", "ImpactWildcardEncode"], ComfyPrimarySource.Text),
    ];

    // Rules for determining workflow output type 
    public static List<(string[], ComfyPrimarySource)> OutputSourceMappings { get; set; } =
    [
        (["PreviewImage", "SaveImage"], ComfyPrimarySource.Image),
        (["SaveAudio", "SaveAudioMP3", "SaveAudioOpus", "PreviewAudio"], ComfyPrimarySource.Audio),
        (["SaveVideo", "SaveWEBM","SaveAnimatedWEBP"], ComfyPrimarySource.Video),
        (["SaveText|pysssss","TT-WhisperTranscription"], ComfyPrimarySource.Text),
        (["VAEDecode"], ComfyPrimarySource.Image),
        (["VAEDecodeAudio"], ComfyPrimarySource.Audio),
        (["WanImageToVideo"], ComfyPrimarySource.Video),
    ];

    private static WorkflowInfo CreateWorkflowInfo(string workflowName, List<Dictionary<string, object?>> nodes)
    {
        ComfyWorkflowType? workflowType = null;
        ComfyPrimarySource? inputSource = null;
        ComfyPrimarySource? outputSource = null;

        var nodeTypes = new HashSet<string>();
        foreach (var node in nodes)
        {
            if (node.GetValueOrDefault("type") is not string nodeType) continue;

            nodeTypes.Add(nodeType);
        }
        
        inputSource = InputSourceMappings.FirstOrDefault(x => x.Item1.Any(y => nodeTypes.Contains(y))).Item2;
        outputSource = OutputSourceMappings.FirstOrDefault(x => x.Item1.Any(y => nodeTypes.Contains(y))).Item2;

        if (inputSource == ComfyPrimarySource.Text)
        {
            if (outputSource == ComfyPrimarySource.Image)
            {
                workflowType = ComfyWorkflowType.TextToImage;
            }
            else if (outputSource == ComfyPrimarySource.Audio)
            {
                workflowType = ComfyWorkflowType.TextToAudio;
            }
        }
        else if (inputSource == ComfyPrimarySource.Image)
        {
            if (outputSource == ComfyPrimarySource.Text)
            {
                workflowType = ComfyWorkflowType.ImageToText;
            }
            else if (outputSource == ComfyPrimarySource.Image)
            {
                workflowType = ComfyWorkflowType.ImageToImage;
            }
            else if (outputSource == ComfyPrimarySource.Video)
            {
                workflowType = ComfyWorkflowType.ImageToVideo;
            }
        }
        else if (inputSource == ComfyPrimarySource.Audio)
        {
            if (outputSource == ComfyPrimarySource.Text)
            {
                workflowType = ComfyWorkflowType.AudioToText;
            }
            else if (outputSource == ComfyPrimarySource.Audio)
            {
                workflowType = ComfyWorkflowType.AudioToAudio;
            }
        }
        else if (inputSource == ComfyPrimarySource.Video)
        {
            if (outputSource == ComfyPrimarySource.Text)
            {
                workflowType = ComfyWorkflowType.VideoToText;
            }
        }

        if (inputSource == null)
            throw new Exception("Could not determine input source");
        if (outputSource == null)
            throw new Exception("Could not determine output source");
        if (workflowType == null)
            throw new Exception("Could not determine workflow type");
        
        var workflowInfo = new WorkflowInfo
        {
            Name = workflowName,
            Type = workflowType.Value,
            Input = inputSource.Value,
            Output = outputSource.Value,
        };
        return workflowInfo;
    }

    public static List<ComfyInputDefinition> GetPromptInputs(List<Dictionary<string, object?>> nodes, List<object> links)
    {
        var inputs = new List<ComfyInputDefinition>();
        
        // Find positive and negative prompt nodes by tracing KSampler links
        int positiveNodeId = -1;
        int negativeNodeId = -1;
        string? positiveNodeType = null;
        string? negativeNodeType = null;
        
        (int nodeId, string nodeType) ResolveConditioningNode(int linkId)
        {
            var sourceNodeId = GetSourceNodeFromLink(linkId, links);
            var sourceNodeType = GetSourceNodeTypeFromLink(nodes, linkId, links);
            
            // If conditioning node is ConditioningSetAreaStrength, use its source text input node instead
            if (sourceNodeType == "ConditioningSetAreaStrength")
            {
                var sourceNode = nodes.FirstOrDefault(n => n["id"] as int? == sourceNodeId);
                if (sourceNode != null)
                {
                    if (sourceNode.GetValueOrDefault("inputs") is List<object> nodeInputs)
                    {
                        foreach (var nodeInput in nodeInputs.Select(i => (Dictionary<string, object?>)i))
                        {
                            if (nodeInput["name"]?.ToString() == "conditioning" && nodeInput["link"] != null)
                            {
                                linkId = Convert.ToInt32(nodeInput["link"]);
                                var useNodeId = GetSourceNodeFromLink(linkId, links);
                                var useNodeType = GetSourceNodeTypeFromLink(nodes, linkId, links);
                                return (useNodeId, useNodeType);
                            }
                        }
                    }
                }
            }

            return (sourceNodeId, sourceNodeType);
        }

        var kSamplerNode = nodes.FirstOrDefault(n => n["type"] is "KSampler");
        if (kSamplerNode != null)
        {
            if (kSamplerNode["inputs"] is List<object> kSamplerInputs)
            {
                foreach (var input in kSamplerInputs.Select(i => (Dictionary<string,object?>)i))
                {
                    if (input["name"]?.ToString() == "positive" && input["link"] != null)
                    {
                        var (nodeId, nodeType) = ResolveConditioningNode(Convert.ToInt32(input["link"]));
                        positiveNodeId = nodeId;
                        positiveNodeType = nodeType;
                    }
                    else if (input["name"]?.ToString() == "negative" && input["link"] != null)
                    {
                        var (nodeId, nodeType) = ResolveConditioningNode(Convert.ToInt32(input["link"]));
                        negativeNodeId = nodeId;
                        negativeNodeType = nodeType;
                    }
                }
            }
        }

        var samplerCustomNode = nodes.FirstOrDefault(n => n["type"] is "SamplerCustom");
        if (samplerCustomNode != null)
        {
            if (samplerCustomNode["inputs"] is List<object> samplerCustomInputs)
            {
                foreach (var input in samplerCustomInputs.Select(i => (Dictionary<string, object?>)i))
                {
                    if (input["name"]?.ToString() == "positive" && input["link"] != null)
                    {
                        var (nodeId, nodeType) = ResolveConditioningNode(Convert.ToInt32(input["link"]));
                        positiveNodeId = nodeId;
                        positiveNodeType = nodeType;
                    }
                    else if (input["name"]?.ToString() == "negative" && input["link"] != null)
                    {
                        var (nodeId, nodeType) = ResolveConditioningNode(Convert.ToInt32(input["link"]));
                        negativeNodeId = nodeId;
                        negativeNodeType = nodeType;
                    }
                }
            }
        }
        
        // Upscalers won't have a KSampler node
        var ultimateSdUpscaleNode = nodes.FirstOrDefault(n => n["type"] is "UltimateSDUpscale");
        if (ultimateSdUpscaleNode != null)
        {
            if (ultimateSdUpscaleNode["inputs"] is List<object> ultimateSdUpscaleInputs)
            {
                foreach (var input in ultimateSdUpscaleInputs.Select(i => (Dictionary<string, object?>)i))
                {
                    if (input["name"]?.ToString() == "positive" && input["link"] != null)
                    {
                        var (nodeId, nodeType) = ResolveConditioningNode(Convert.ToInt32(input["link"]));
                        positiveNodeId = nodeId;
                        positiveNodeType = nodeType;
                    }
                    else if (input["name"]?.ToString() == "negative" && input["link"] != null)
                    {
                        var (nodeId, nodeType) = ResolveConditioningNode(Convert.ToInt32(input["link"]));
                        negativeNodeId = nodeId;
                        negativeNodeType = nodeType;
                    }
                }
            }
        }
        
        var basicGuiderNode = nodes.FirstOrDefault(n => n["type"] is "BasicGuider");
        if (basicGuiderNode != null)
        {
            if (basicGuiderNode["inputs"] is List<object> basicGuiderInputs)
            {
                foreach (var input in basicGuiderInputs.Select(i => (Dictionary<string, object?>)i))
                {
                    if (input["name"]?.ToString() == "conditioning" && input["link"] != null)
                    {
                        var (nodeId, nodeType) = ResolveConditioningNode(Convert.ToInt32(input["link"]));
                        positiveNodeId = nodeId;
                        positiveNodeType = nodeType;
                    }
                }
            }
        }
        
        var clipTextEncodeSDXL = nodes.FirstOrDefault(n => n["type"] is "CLIPTextEncodeSDXL");
        if (clipTextEncodeSDXL != null)
        {
            if (clipTextEncodeSDXL["inputs"] is List<object> clipTextEncodeSDXLInputs)
            {
                foreach (var input in clipTextEncodeSDXLInputs.Select(i => (Dictionary<string, object?>)i))
                {
                    if (input["name"]?.ToString() == "text_l" && input["link"] != null)
                    {
                        var (nodeId, nodeType) = ResolveConditioningNode(Convert.ToInt32(input["link"]));
                        positiveNodeId = nodeId;
                        positiveNodeType = nodeType;
                    }
                    else if (input["name"]?.ToString() == "text_g" && input["link"] != null)
                    {
                        var (nodeId, nodeType) = ResolveConditioningNode(Convert.ToInt32(input["link"]));
                        negativeNodeId = nodeId;
                        negativeNodeType = nodeType;
                    }
                }
            }
        }

        // Extract workflow inputs
        if (positiveNodeId != -1)
        {
            var positiveNode = nodes.FirstOrDefault(n => n["id"] as int? == positiveNodeId);
            if (positiveNode != null)
            {
                // Check if node type has a 'positive' required input and use that instead (e.g. WanImageToVideo)
                if (positiveNode["inputs"] is List<object> positiveNodeInputs)
                {
                    foreach (var input in positiveNodeInputs.Select(i => (Dictionary<string, object?>)i))
                    {
                        if (input.TryGetValue("name", out var oName) && oName is string name
                            && input.TryGetValue("type", out var oType) && oType is string type
                            && input.TryGetValue("link", out var oLink) && oLink is int link)
                        {
                            if (name == "positive" && type == "CONDITIONING")
                            {
                                positiveNodeId = GetSourceNodeFromLink(link, links);
                                positiveNodeType = GetSourceNodeTypeFromLink(nodes, link, links);
                                break;
                            }
                        }
                    }
                }
            }
            
            // Add positive prompt input
            inputs.Add(new ComfyInputDefinition
            {
                ClassType = positiveNodeType,
                NodeId = positiveNodeId,
                ValueIndex = 0,
                Name = "positivePrompt",
                Label = "Positive Prompt",
                Type = ComfyInputType.String,
                Tooltip = "The text to be encoded for positive conditioning",
                Multiline = true,
                Default = GetNodeWidgetValue(nodes, positiveNodeId, 0)
            });
        }
        if (negativeNodeId != -1)
        {
            // Don't include ConditioningZeroOut as it's just a pass through
            if (negativeNodeType != "ConditioningZeroOut")
            {
                var negativeNode = nodes.FirstOrDefault(n => n["id"] as int? == negativeNodeId);
                if (negativeNode != null)
                {
                    // Check if node type has a 'negative' required input and use that instead (e.g. WanImageToVideo)
                    if (negativeNode["inputs"] is List<object> negativeNodeInputs)
                    {
                        foreach (var input in negativeNodeInputs.Select(i => (Dictionary<string, object?>)i))
                        {
                            if (input.TryGetValue("name", out var oName) && oName is string name
                                 && input.TryGetValue("type", out var oType) && oType is string type
                                 && input.TryGetValue("link", out var oLink) && oLink is int link)
                            {
                                if (name == "negative" && type == "CONDITIONING")
                                {
                                    negativeNodeId = GetSourceNodeFromLink(link, links);
                                    negativeNodeType = GetSourceNodeTypeFromLink(nodes, link, links);
                                    break;
                                }
                            }
                        }
                    }
                }

                
                // Add negative prompt input
                inputs.Add(new ComfyInputDefinition
                {
                    ClassType = negativeNodeType,
                    NodeId = negativeNodeId,
                    ValueIndex = 0,
                    Name = "negativePrompt",
                    Label = "Negative Prompt",
                    Type = ComfyInputType.String,
                    Tooltip = "The text to be encoded for negative conditioning",
                    Multiline = true,
                    Default = GetNodeWidgetValue(nodes, negativeNodeId, 0)
                });
            }
        }
        return inputs;
    }
    

    private static int GetSourceNodeFromLink(int linkId, List<object> links)
    {
        foreach (var link in links.Select(l => l as List<object>))
        {
            if (link is { Count: >= 6 } && Convert.ToInt32(link[0]) == linkId)
            {
                return Convert.ToInt32(link[1]); // Source node ID
            }
        }
        return -1;
    }
    
    private static string GetSourceNodeTypeFromLink(List<Dictionary<string,object?>> nodes, int linkId, List<object> links)
    {
        var sourceNodeId = GetSourceNodeFromLink(linkId, links);
        return nodes.Select(n => n.ToObjectDictionary())
            .FirstOrDefault(n => Convert.ToInt32(n["id"]) == sourceNodeId)?
            ["type"]?.ToString() ?? "";
    }

    private static object GetNodeWidgetValue(List<Dictionary<string,object?>> nodes, int nodeId, int widgetIndex)
    {
        var node = nodes.Select(n => n.ToObjectDictionary())
            .FirstOrDefault(n => Convert.ToInt32(n["id"]) == nodeId);
        if (node != null)
        {
            if (node["widgets_values"] is List<object> widgetValues && widgetValues.Count > widgetIndex)
            {
                return widgetValues[widgetIndex];
            }
        }
        return "";
    }

    public static MergeWorkflowResult MergeWorkflow(Dictionary<string, object?> workflow, Dictionary<string, object?> args, WorkflowInfo workflowInfo, ILogger? log=null)
    {
        ArgumentNullException.ThrowIfNull(workflow);
        ArgumentNullException.ThrowIfNull(args);
        ArgumentNullException.ThrowIfNull(workflowInfo);

        log ??= NullLogger.Instance;

        var ret = new MergeWorkflowResult
        {
            OriginalWorkflow = workflow,
            Args = new Dictionary<string, object>(args),
        };

        if (workflow["nodes"] is not List<object> nodesArray)
            throw new Exception("No nodes found in workflow JSON");

        foreach (var input in workflowInfo.Inputs)
        {
            var argValue = args.GetValueOrDefault(input.Name);
            if (argValue == null)
            {
                ret.MissingInputs.Add(input.Name);
                continue;
            }

            try
            {
                ret.Args.Remove(input.Name);

                // Find the node in the JSON array
                Dictionary<string,object?>? targetNode = null;
                int nodeIndex = -1;

                for (int i = 0; i < nodesArray.Count; i++)
                {
                    var node = nodesArray[i] as Dictionary<string, object?>;
                    if (node == null) continue;

                    if (node.GetValueOrDefault("id")?.ConvertTo<int>() == input.NodeId)
                    {
                        targetNode = node;
                        nodeIndex = i;
                        break;
                    }
                }

                if (targetNode == null)
                {
                    log.LogWarning("Node {NodeId} not found for input '{InputName}'", input.NodeId, input.Name);
                    continue;
                }

                // Get the widgets_values array
                if (targetNode.GetValueOrDefault("widgets_values") is not List<object?> widgetsValues)
                {
                    log.LogWarning("No widgets_values found for node {NodeId} for input '{InputName}'", input.NodeId, input.Name);
                    continue;
                }

                // Check if the value index is valid
                if (input.ValueIndex >= widgetsValues.Count)
                {
                    log.LogWarning("Value index {ValueIndex} is out of range for node {NodeId} widgets_values (count: {Count})",
                        input.ValueIndex, input.NodeId, widgetsValues.Count);
                    continue;
                }
                
                object LargestInteger(object? value)
                {
                    var longValue = value.ConvertTo<long>();
                    if (longValue is > int.MinValue and < int.MaxValue)
                    {
                        return (int)longValue;
                    }
                    return longValue;
                }

                // Replace the widget value with the argument value
                try
                {
                    // Convert the argument value to the appropriate type based on the input type
                    object? newValue;
                    switch (input.Type)
                    {
                        case ComfyInputType.Int:
                            newValue = argValue is JsonElement elInt
                                ? elInt.AsObject()
                                : LargestInteger(argValue);
                            break;
                        case ComfyInputType.Float:
                            newValue = argValue is JsonElement elFloat
                                ? elFloat.ValueKind == JsonValueKind.Number
                                    ? elFloat.GetDouble()
                                    : elFloat.AsObject()
                                : argValue.ConvertTo<double>();
                            break;
                        case ComfyInputType.Boolean:
                            newValue = argValue is JsonElement elBool 
                                ? elBool.ValueKind is JsonValueKind.True or JsonValueKind.False
                                    ? elBool.GetBoolean()
                                    : elBool.AsObject().ConvertTo<bool>()
                                : argValue.ConvertTo<bool>();
                            break;
                        case ComfyInputType.String:
                        case ComfyInputType.Enum:
                        default:
                            newValue = argValue is JsonElement elAny
                                ? elAny.AsObject()?.ToString()
                                : argValue.ConvertTo<string>();
                            break;
                    }

                    // Replace the value in the widgets_values array
                    widgetsValues[input.ValueIndex] = newValue;
                    log.LogDebug("Replaced value at index {ValueIndex} for node {NodeId} with {Value}",
                        input.ValueIndex, input.NodeId, argValue);
                }
                catch (Exception ex)
                {
                    log.LogError(ex, "Failed to replace widget value for node {NodeId} at index {ValueIndex} with value {Value}",
                        input.NodeId, input.ValueIndex, argValue);
                }
            }
            catch (Exception e)
            {
                log.LogError(e, "Failed to merge workflow for input '{InputName}' with '{ArgValue}'", input.Name, argValue);
            }
        }

        // Any remaining args are extra inputs that weren't used
        ret.ExtraInputs.AddRange(ret.Args.Keys);

        // Serialize the modified workflow back to JSON
        ret.Result = workflow;

        return ret;
    }
}

public class MergeWorkflowResult
{
    public Dictionary<string, object?> OriginalWorkflow { get; set; }
    public Dictionary<string,object> Args { get; set; }
    public List<string> MissingInputs { get; set; } = [];
    public List<string> ExtraInputs { get; set; } = [];
    public Dictionary<string, object?> Result { get; set; }
}