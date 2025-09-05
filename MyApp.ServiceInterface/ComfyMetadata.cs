using System.Collections.Concurrent;
using System.Text.Json;
using System.Text.Json.Serialization;
using MyApp.ServiceModel;
using ServiceStack.Text;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace MyApp.ServiceInterface;

public class ComfyMetadata
{
    public const string DefaultUrl = "https://localhost:5005";
    public static readonly ComfyMetadata Instance = new();
    public static JsonSerializerOptions JsonOptions => new() { PropertyNameCaseInsensitive = true };

    public readonly ConcurrentDictionary<string, Dictionary<string, NodeInfo>> NodeDefinitions = new();

    public async Task<Dictionary<string, NodeInfo>> LoadNodeDefinitionsAsync(HttpClient client)
    {
        var url = client.BaseAddress!.AbsoluteUri;
        if (NodeDefinitions.TryGetValue(url, out var nodeDefinitions))
            return nodeDefinitions;

        var json = await client.GetStringAsync("/api/object_info");
        return LoadObjectInfo(json, url);
    }

    public Dictionary<string, NodeInfo> LoadObjectInfo(string json, string url=DefaultUrl)
    {
        var nodeDefinitions = ParseNodeDefinitions(json);
        NodeDefinitions[url] = nodeDefinitions;
        return nodeDefinitions;
    }

    public Dictionary<string, NodeInfo>? NodeDefinitionsFor(string comfyBaseUrl) => 
        NodeDefinitions.GetValueOrDefault(comfyBaseUrl);

    public Dictionary<string, NodeInfo> DefaultNodeDefinitions =>
        NodeDefinitions.GetValueOrDefault(DefaultUrl) ?? throw new ArgumentNullException(nameof(NodeDefinitions));

    public static JsonDocument LoadJsonDocument(string objectInfoJson)
    {
        JsonDocument? jsonDoc = null;
        try
        {
            jsonDoc = JsonDocument.Parse(objectInfoJson, new JsonDocumentOptions
            {
                AllowTrailingCommas = true,
                CommentHandling = JsonCommentHandling.Skip
            });
            return jsonDoc;
        }
        catch
        {
            jsonDoc?.Dispose();
            throw;
        }
    }

    /// <summary>
    /// Loads and parses the object_info.json file.
    /// </summary>
    /// <param name="objectInfoJson">The JSON content of object_info.json</param>
    public static Dictionary<string, NodeInfo> ParseNodeDefinitions(string objectInfoJson)
    {
        // Parse the JSON document directly
        using var jsonDoc = LoadJsonDocument(objectInfoJson);
        return ParseNodeDefinitions(jsonDoc);
    }

    public static Dictionary<string, List<string>> ParseModels(string objectInfoJson)
    {
        // Parse the JSON document directly
        using var jsonDoc = LoadJsonDocument(objectInfoJson);
        return ParseModels(jsonDoc);
    }

    public static Dictionary<string, List<string>> ParseModels(JsonDocument jsonDoc)
    {
        var ret = new Dictionary<string, List<string>>();
        foreach (var nodeProp in jsonDoc.RootElement.EnumerateObject())
        {
            var nodeName = nodeProp.Name;
            if (nodeName != "RequiresAsset") 
                continue;

            if (nodeProp.Value.TryGetProperty("input", out var inputProp))
            {
                if (inputProp.TryGetProperty("hidden", out var hiddenProp))
                {
                    foreach (var hiddenInput in hiddenProp.EnumerateObject())
                    {
                        if (hiddenInput.Value.ValueKind == JsonValueKind.Array)
                        {
                            var firstElement = hiddenInput.Value[0];
                            if (firstElement.ValueKind == JsonValueKind.Array)
                            {
                                ret[hiddenInput.Name] = firstElement.EnumerateArray().Select(e => $"{e.AsObject()}").ToList();
                            }
                        }
                    }
                }
            }
        }
        return ret;
    }

    /// <summary>
    /// Loads and parses the object_info.json file.
    /// </summary>
    /// <param name="jsonDoc">The JSON document of object_info.json</param>
    public static Dictionary<string, NodeInfo> ParseNodeDefinitions(JsonDocument jsonDoc)
    {
        // Create a dictionary to hold the node info
        var objectInfo = new Dictionary<string, NodeInfo>();

        // Process each node in the JSON document
        foreach (var nodeProp in jsonDoc.RootElement.EnumerateObject())
        {
            var nodeName = nodeProp.Name;
            var nodeInfo = new NodeInfo
            {
                Name = nodeName,
                Input = new Dictionary<string, Dictionary<string, NodeInputDefinition>>()
            };

            // Process the node properties
            if (nodeProp.Value.TryGetProperty("input", out var inputProp))
            {
                // Process required inputs
                if (inputProp.TryGetProperty("required", out var requiredProp))
                {
                    var requiredInputs = new Dictionary<string, NodeInputDefinition>();
                    foreach (var reqInput in requiredProp.EnumerateObject())
                    {
                        requiredInputs[reqInput.Name] = Parse(reqInput.Value);
                    }
                    nodeInfo.Input["required"] = requiredInputs;
                }

                // Process optional inputs
                if (inputProp.TryGetProperty("optional", out var optionalProp))
                {
                    var optionalInputs = new Dictionary<string, NodeInputDefinition>();
                    foreach (var optInput in optionalProp.EnumerateObject())
                    {
                        optionalInputs[optInput.Name] = Parse(optInput.Value);
                    }
                    nodeInfo.Input["optional"] = optionalInputs;
                }
            }
            
            if (nodeProp.Value.TryGetProperty("input_order", out var inputOrderProp))
            {
                nodeInfo.InputOrder = JsonSerializer.Deserialize<NodeInputOrder>(inputOrderProp.GetRawText(), JsonOptions);
            }

            objectInfo[nodeName] = nodeInfo;
        }

        return objectInfo;
    }

    public static NodeInputDefinition Parse(JsonElement rawValue)
    {
        if (rawValue.ValueKind == JsonValueKind.Array && rawValue.GetArrayLength() > 0)
        {
            var firstElement = rawValue[0];
            var ret = new NodeInputDefinition
            {
                Type = GetDataType(firstElement), 
            };
            if (firstElement.ValueKind == JsonValueKind.Array)
            {
                ret.EnumValues = firstElement.EnumerateArray().Select(e => $"{e.AsObject()}").ToArray();
            }
            else if (firstElement.ValueKind == JsonValueKind.Object)
            {
                ret.ComboValues = new();
                foreach (var entry in firstElement.EnumerateObject())
                {
                    var value = entry.Value.AsObject();
                    if (value == null) continue;
                    ret.ComboValues[entry.Name] = value;
                }
            }
            if (rawValue.GetArrayLength() > 1)
            {
                var secondElement = rawValue[1];
                if (secondElement.ValueKind == JsonValueKind.Object)
                {
                    ret.Options = new();
                    foreach (var entry in secondElement.EnumerateObject())
                    {
                        var value = entry.Value.AsObject();
                        if (value == null) continue;
                        ret.Options[entry.Name] = value;
                        if (entry.Name == "control_after_generate")
                        {
                            ret.ControlAfterGenerate = entry.Value.GetBoolean();
                        }
                    }
                }
            }
            return ret;
        }
        throw new Exception($"Could not parse node input definition from {rawValue}");
    }

    public static ComfyInputType GetDataType(JsonElement firstElement)
    {
        if (firstElement.ValueKind == JsonValueKind.String)
        {
            return firstElement.GetString() switch
            {
                "AUDIO" => ComfyInputType.Audio,
                "BOOLEAN" => ComfyInputType.Boolean,
                "CLIP" => ComfyInputType.Clip,
                "CLIP_VISION" => ComfyInputType.ClipVision,
                "CLIP_VISION_OUTPUT" => ComfyInputType.ClipVisionOutput,
                "COMBO" => ComfyInputType.Combo,
                "CONDITIONING" => ComfyInputType.Conditioning,
                "CONTROL_NET" => ComfyInputType.ControlNet,
                "ENUM" => ComfyInputType.Enum,
                "FASTERWHISPERMODEL" => ComfyInputType.FasterWhisperModel,
                "FILEPATH" => ComfyInputType.Filepath,
                "FL2MODEL" => ComfyInputType.Fl2Model,
                "FLOAT" => ComfyInputType.Float,
                "FLOATS" => ComfyInputType.Floats,
                "GLIGEN" => ComfyInputType.Gligen,
                "GUIDER" => ComfyInputType.Guider,
                "HOOKS" => ComfyInputType.Hooks,
                "IMAGE" => ComfyInputType.Image,
                "INT" => ComfyInputType.Int,
                "LATENT" => ComfyInputType.Latent,
                "LATENT_OPERATION" => ComfyInputType.LatentOperation,
                "LOAD_3D" => ComfyInputType.Load3D,
                "LOAD_3D_ANIMATION" => ComfyInputType.Load3DAnimation,
                "MASK" => ComfyInputType.Mask,
                "MESH" => ComfyInputType.Mesh,
                "MODEL" => ComfyInputType.Model,
                "NOISE" => ComfyInputType.Noise,
                "PHOTOMAKER" => ComfyInputType.Photomaker,
                "SAMPLER" => ComfyInputType.Sampler,
                "SIGMAS" => ComfyInputType.Sigmas,
                "STRING" => ComfyInputType.String,
                "STYLE_MODEL" => ComfyInputType.StyleModel,
                "SUBTITLE" => ComfyInputType.Subtitle,
                "TRANSCRIPTION_PIPELINE" => ComfyInputType.TranscriptionPipeline,
                "TRANSCRIPTIONS" => ComfyInputType.Transcriptions,
                "UPSCALE_MODEL" => ComfyInputType.UpscaleModel,
                "VAE" => ComfyInputType.VAE,
                "VHS_AUDIO" => ComfyInputType.VHSAudio,
                "VOXEL" => ComfyInputType.Voxel,
                "WAV_BYTES" => ComfyInputType.WavBytes,
                "WAV_BYTES_BATCH" => ComfyInputType.WavBytesBatch,
                "WEBCAM" => ComfyInputType. Webcam,
                _ => ComfyInputType.Unknown
            };
        }
        if (firstElement.ValueKind == JsonValueKind.Array)
        {
            // For combo boxes, the type is usually STRING, but let's just indicate it's an enum
            return ComfyInputType.Enum;
        }
        if (firstElement.ValueKind == JsonValueKind.Object)
        {
            return ComfyInputType.Combo;
        }
        return ComfyInputType.Unknown; // Fallback
    }
}

