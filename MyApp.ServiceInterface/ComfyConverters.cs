using System.Runtime.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using ServiceStack;
using MyApp.ServiceModel;

namespace MyApp.ServiceInterface;

public class WorkflowNodeInput
{
    [DataMember(Name = "name")] public string Name { get; set; }
    [DataMember(Name = "type")] public string Type { get; set; }
    [DataMember(Name = "link")] public int? Link { get; set; } // Link ID if connected

    public static WorkflowNodeInput Parse(object obj)
    {
        var dict = (Dictionary<string, object>)obj;
        var ret = new WorkflowNodeInput
        {
            Name = dict.GetValueOrDefault("name")?.ToString() ?? throw new Exception("No name found for input"),
            Type = dict.GetValueOrDefault("type")?.ToString() ?? throw new Exception("No type found for input"),
            Link = dict.GetValueOrDefault("link")?.ConvertTo<int>(),
        };
        return ret;
    }
}
public class WorkflowNodeOutput
{
    [DataMember(Name = "name")] public string Name { get; set; }
    [DataMember(Name = "type")] public string Type { get; set; }
    [DataMember(Name = "links")] public List<int>? Links { get; set; }

    public static WorkflowNodeOutput Parse(object obj)
    {
        var dict = (Dictionary<string, object>)obj;
        var ret = new WorkflowNodeOutput
        {
            Name = dict.GetValueOrDefault("name")?.ToString() ?? throw new Exception("No name found for output"),
            Type = dict.GetValueOrDefault("type")?.ToString() ?? throw new Exception("No type found for output"),
            Links = dict.GetValueOrDefault("links") is List<object> links
                ? links.Map(x => x.ConvertTo<int>())
                : null
        };
        return ret;
    }
}

public class ComfyNode
{
    [DataMember(Name = "id")] public string Id { get; set; }
    public int? IdInt { get; set; }
    [DataMember(Name = "type")] public string Type { get; set; }

    [DataMember(Name = "pos")] public object? Pos { get; set; }
    [DataMember(Name = "size")] public object? Size { get; set; }
    [DataMember(Name = "flags")] public Dictionary<string,object?>? Flags { get; set; }

    [DataMember(Name = "order")] public int? Order { get; set; }
    [DataMember(Name = "mode")] public int? Mode { get; set; }

    [DataMember(Name = "inputs")] public List<WorkflowNodeInput>? Inputs { get; set; }
    public Dictionary<string, WorkflowNodeInput> InputMap { get; set; } = new();
    [DataMember(Name = "outputs")] public List<WorkflowNodeOutput>? Outputs { get; set; }
    [DataMember(Name = "widgets_values")] public List<object>? WidgetsValues { get; set; }

    public static ComfyNode Parse(Dictionary<string, object?> nodeObj)
    {
        var ret = new ComfyNode
        {
            Id = nodeObj.GetValueOrDefault("id")?.ToString() ?? throw new Exception("No id found for node"),
            Type = nodeObj.GetValueOrDefault("type")?.ToString() ?? throw new Exception("No type found for node"),
            Pos = nodeObj.GetValueOrDefault("pos"),
            Size = nodeObj.GetValueOrDefault("size"),
            Flags = nodeObj.GetValueOrDefault("flags") as Dictionary<string, object?>,
            Order = nodeObj.GetValueOrDefault("order")?.ConvertTo<int>(),
            Mode = nodeObj.GetValueOrDefault("mode")?.ConvertTo<int>(),
            Inputs = nodeObj.GetValueOrDefault("inputs") is List<object> inputs
                ? inputs.Map(WorkflowNodeInput.Parse)
                : null,
            Outputs = nodeObj.GetValueOrDefault("outputs") is List<object> outputs
                ? outputs.Map(WorkflowNodeOutput.Parse)
                : null,
            WidgetsValues = nodeObj.GetValueOrDefault("widgets_values") as List<object>
        };
        if (int.TryParse(ret.Id, out var idInt))
        {
            ret.IdInt = idInt;
        }
        if (ret.Inputs != null)
            ret.InputMap = ret.Inputs.ToDictionary(x => x.Name, x => x);
        return ret;
    }
}

/// <summary>
/// Array of links in the workflow JSON.
/// https://docs.comfy.org/specs/workflow_json
/// </summary>
public class WorkflowLink
{
    public int Id { get; set; }
    public string OriginId { get; set; }
    public int? OriginIdInt { get; set; }
    public string OriginSlot { get; set; }
    public int? OriginSlotInt { get; set; }
    public string TargetId { get; set; }
    public int? TargetIdInt { get; set; }
    public string TargetSlot { get; set; }
    public int? TargetSlotInt { get; set; }
    public string Type => Types.First();
    public List<string> Types { get; set; }
    public int? ParentId { get; set; }

    public static WorkflowLink Parse(List<object> linkArray)
    {
        if (linkArray.Count < 5)
            throw new Exception($"Invalid Link Array: {JSON.stringify(linkArray)}");

        var ret = new WorkflowLink
        {
            Id = linkArray[0].ConvertTo<int>(),
            OriginId = linkArray[1].ToString() ?? "",
            OriginSlot = linkArray[2].ToString() ?? "",
            TargetId = linkArray[3].ToString() ?? "",
            TargetSlot = linkArray[4].ToString() ?? "",
            Types = linkArray[5] is List<object> arrTypes
                ? arrTypes.Map(x => x.ToString() ?? "")
                : [linkArray[5].ToString() ?? ""]
        };
        if (int.TryParse(ret.OriginId, out var originIdInt))
            ret.OriginIdInt = originIdInt;
        if (int.TryParse(ret.OriginSlot, out var originSlotInt))
            ret.OriginSlotInt = originSlotInt;
        if (int.TryParse(ret.TargetId, out var targetIdInt))
            ret.TargetIdInt = targetIdInt;
        if (int.TryParse(ret.TargetSlot, out var targetSlotInt))
            ret.TargetSlotInt = targetSlotInt;

        if (linkArray.Count > 6)
        {
            ret.ParentId = linkArray[6].ConvertTo<int>();
        }
        return ret;
    }
}

public static class ComfyConverters
{
    /// <summary>
    /// Converts a ComfyUI workflow JSON string to an /api/prompt JSON string.
    /// Requires object_info.json to have been loaded first via LoadObjectInfo.
    /// </summary>
    /// <param name="workflowJson">The JSON content of the ComfyUI workflow.</param>
    /// <returns>The JSON content for the /api/prompt endpoint.</returns>
    /// <exception cref="InvalidOperationException">Thrown if object_info.json was not loaded.</exception>
    /// <exception cref="JsonException">Thrown if the workflow JSON is invalid.</exception>
    public static ApiPrompt ConvertWorkflowToApiPrompt(Dictionary<string, object?> workflow,
        Dictionary<string, NodeInfo> nodeDefs, string? clientId = null, ILogger? log = null)
    {
        log ??= NullLogger.Instance;
        clientId ??= Guid.NewGuid().ToString("N");

        // var workflowJsonNode = JsonNode.Parse(workflowJson);
        //
        // var workflow = workflowJsonNode.Deserialize<ComfyUIWorkflow>(JsonOptions);
        // if (workflow == null)
        //     throw new JsonException("Invalid ComfyUI workflow JSON format.");
        //
        // // Process the array-based data into our structured format
        // workflow.ProcessData();

        var nodesObjs = workflow.GetValueOrDefault("nodes") as List<object> ?? TypeConstants.EmptyObjectList;
        var nodes = new Dictionary<string, ComfyNode>();
        foreach (var nodeObj in nodesObjs)
        {
            if (nodeObj is Dictionary<string, object?> nodeDict)
            {
                var node = ComfyNode.Parse(nodeDict);
                nodes[node.Id] = node;
            }
        }

        // Check if we have nodes to process
        if (nodesObjs.Count == 0)
            throw new Exception("No nodes found in workflow JSON.");

        var links = new List<WorkflowLink>();
        var linksObjs = workflow.GetValueOrDefault("links") as List<object> ?? TypeConstants.EmptyObjectList;
        foreach (var linkObj in linksObjs)
        {
            if (linkObj is List<object> linkArray)
            {
                links.Add(WorkflowLink.Parse(linkArray));
            }
        }

        //ComfyUIWorkflow
        var apiPrompt = new ApiPrompt
        {
            ClientId = clientId,
            ExtraData = new Dictionary<string, object?>
            {
                ["extra_pnginfo"] = new Dictionary<string, object?>
                {
                    ["workflow"] = workflow
                },
                ["client_id"] = clientId,
            },
        };

        var linkLookup = new Dictionary<int, WorkflowLink>();
        foreach (var link in links)
        {
            linkLookup[link.Id] = link;
        }

        foreach (var nodeEntry in nodes)
        {
            var nodeId = nodeEntry.Key;
            var workflowNode = nodeEntry.Value;

            if (string.IsNullOrEmpty(workflowNode.Type))
            {
                log.LogWarning("Node {NodeId} has no class_type. Skipping.", nodeId);
                continue;
            }

            // Skip PrimitiveNode and Note types as they're not actual nodes in the API prompt
            // PrimitiveNode are just containers for values that are used by other nodes
            // Note nodes are just for documentation and don't affect the workflow
            if (workflowNode.Type == "PrimitiveNode" || workflowNode.Type == "Note")
            {
                continue;
            }

            // Create the API node representation
            var apiNode = new ApiNode
            {
                ClassType = workflowNode.Type,
                Inputs = new Dictionary<string, object>()
            };

            // Look up the node definition from object_info for input ordering
            if (!nodeDefs.TryGetValue(workflowNode.Type, out var nodeInfo) ||
                nodeInfo?.InputOrder == null)
            {
                log.LogWarning(
                    "Node definition not found or incomplete for class_type '{WorkflowNodeType}'. Attempting partial conversion without input order.",
                    workflowNode.Type);
                // If object_info is missing, we can only copy widget values and inputs dictionary directly
                // This might not map widgets correctly to names, but it's a fallback.
                // A more robust approach might fail conversion here.
                if (workflowNode.WidgetsValues != null)
                {
                    // Without names from object_info, we can't map widgets correctly by name.
                    // We could try to guess or just skip them, as connections are named.
                    // Let's skip widgets if info is missing, rely only on named connections.
                    log.LogWarning("Skipping widget values for node {NodeId} because object_info is missing.", nodeId);
                }

                if (workflowNode.Inputs != null)
                {
                    foreach (var inputDef in workflowNode.InputMap)
                    {
                        if (inputDef.Value.Link.HasValue &&
                            linkLookup.TryGetValue(inputDef.Value.Link.Value, out var link))
                        {
                            // Check if the origin node is a PrimitiveNode
                            var originNodeId = link.OriginId;
                            if (nodes.TryGetValue(originNodeId, out var originNode) && originNode.Type == "PrimitiveNode")
                            {
                                // For PrimitiveNode, use the widget value directly
                                if (originNode.WidgetsValues is { Count: > 0 })
                                {
                                    apiNode.Inputs[inputDef.Key] = originNode.WidgetsValues[0];
                                }
                            }
                            else
                            {
                                // Add connection: [origin_id, origin_slot]
                                apiNode.Inputs[inputDef.Key] = new List<object>
                                {
                                    link.OriginId,
                                    link.OriginSlotInt ?? (object)link.OriginSlot,
                                };
                            }
                        }
                        // Note: If workflowNode.Inputs contained static values directly, this fallback would need to handle that.
                        // Standard workflow JSON usually puts static values in widgets_values.
                    }
                }
            }
            else
            {
                // Use input_order from object_info to map widgets_values and inputs
                var allInputNamesInOrder = nodeInfo.InputOrder.GetAllInputNamesInOrder();
                var widgetValueIndex = 0;

                var requiredInputs = nodeInfo.Input?.GetValueOrDefault("required");
                var optionalInputs = nodeInfo.Input?.GetValueOrDefault("optional");

                foreach (var inputName in allInputNamesInOrder)
                {
                    WorkflowNodeInput? inputDef = null;
                    bool isConnected = workflowNode.InputMap != null &&
                                       workflowNode.InputMap.TryGetValue(inputName, out inputDef) &&
                                       inputDef.Link.HasValue;

                    if (isConnected)
                    {
                        // This input is connected, get info from the link
                        var linkId = inputDef!.Link!.Value;
                        if (linkLookup.TryGetValue(linkId, out var link))
                        {
                            // Check if the origin node is a PrimitiveNode
                            var originNodeId = link.OriginId;
                            if (nodes.TryGetValue(originNodeId, out var originNode) && originNode.Type == "PrimitiveNode")
                            {
                                // For PrimitiveNode, use the widget value directly
                                if (originNode.WidgetsValues is { Count: > 0 })
                                {
                                    apiNode.Inputs[inputName] = originNode.WidgetsValues[0];
                                }
                            }
                            else
                            {
                                // Add connection: [origin_id, origin_slot]
                                apiNode.Inputs[inputName] = new List<object>
                                {
                                    link.OriginId,
                                    link.OriginSlotInt ?? (object)link.OriginSlot,
                                };
                            }
                        }
                        else
                        {
                            log.LogWarning(
                                "Link {LinkId} not found for input '{InputName}' on node {NodeId}. Skipping connection.",
                                linkId, inputName, nodeId);
                        }
                    }
                    else
                    {
                        // This input should get its value from widgets_values
                        if (workflowNode.WidgetsValues != null && widgetValueIndex < workflowNode.WidgetsValues.Count)
                        {
                            var nodeInputDef = requiredInputs?.GetValueOrDefault(inputName)
                                               ?? optionalInputs?.GetValueOrDefault(inputName);
                            var value = workflowNode.WidgetsValues[widgetValueIndex];

                            var inWidgetValues = (nodeInputDef == null && inputName.EndsWith("seed")) ||
                             nodeInputDef?.Type is ComfyInputType.Int or ComfyInputType.Float
                                 or ComfyInputType.String or ComfyInputType.Boolean
                                 or ComfyInputType.Enum
                                 or ComfyInputType.Combo or ComfyInputType.Filepath;
                            if (inWidgetValues)
                            {
                                apiNode.Inputs[inputName] = value; // Deserialize element to object
                                widgetValueIndex++;
                                if (nodeInputDef?.ControlAfterGenerate == true)
                                {
                                    widgetValueIndex++;
                                }
                            }
                        }
                        else
                        {
                            // This indicates a mismatch between object_info and workflow JSON
                            log.LogWarning(
                                "Input '{InputName}' on node {NodeId} (class_type: {WorkflowNodeType}) is not connected and no corresponding value found in widgets_values at index {WidgetValueIndex}. This may result in missing input in API call.",
                                inputName, nodeId, workflowNode.Type, widgetValueIndex);
                            // Optional: Add a default value if available in object_info, though API usually handles missing inputs with defaults.
                        }
                    }
                }

                // Optional: Check if there are leftover widgets_values (indicates mismatch)
                if (workflowNode.WidgetsValues != null && widgetValueIndex < workflowNode.WidgetsValues.Count)
                {
                    log.LogWarning(
                        "Node {NodeId} (class_type: {WorkflowNodeType}) has {UnexpectedValues} unexpected values in widgets_values.",
                        nodeId, workflowNode.Type, workflowNode.WidgetsValues.Count - widgetValueIndex);
                }
            }

            // Add the API node to the prompt structure
            apiPrompt.Prompt[nodeId] = apiNode;
        }

        return apiPrompt;
    }
    
    public static Dictionary<string, ApiNode> CreatePrompt(Dictionary<string, ApiNode> prompt, WorkflowInfo info, Dictionary<string, object?> args, ILogger? log=null)
    {
        log ??= NullLogger.Instance;
        foreach (var input in info.Inputs)
        {
            var nodeId = input.NodeId.ToString();
            if (!prompt.TryGetValue(nodeId, out var node))
            {
                log.LogWarning("Node {NodeId} not found in API prompt, Skipping.", nodeId);
                continue;
            }

            var value = args.GetValueOrDefault(input.Name);
            if (value == null)
            {
                log.LogWarning("No value found for input '{InputName}', Skipping.", input.Name);
                continue;
            }
            
            var inputName = input.Name;
            if (input.Name is "positivePrompt" or "negativePrompt")
            {
                inputName = "text";
            }
            node.Inputs[inputName] = value;
        }

        // Remove instructive RequiresAsset nodes to avoid unnecessary processing 
        var idsToRemove = new List<string>();
        foreach (var node in prompt)
        {
            if (node.Value.ClassType == "RequiresAsset")
            {
                idsToRemove.Add(node.Key);
            }
        }
        foreach (var id in idsToRemove)
        {
            prompt.Remove(id);
        }
        
        return prompt;
    }
    
    public static WorkflowResult ParseComfyResult(Dictionary<string, object?> result, string? comfyApiBaseUrl = null)
    {
        var promptId = result.Keys.First();
        // Access the outputs section for this execution
        var elPrompt = (Dictionary<string, object?>)result[promptId]!;

        var ret = elPrompt.GetValueOrDefault("outputs") is Dictionary<string, object?> elOutputs
            ? GetOutputs(elOutputs, minRating:Rating.PG)
            : new WorkflowResult();

        if (comfyApiBaseUrl != null && ret.Assets?.Count > 0)
        {
            foreach (var asset in ret.Assets.Safe())
            {
                if (asset.Url.StartsWith('/'))
                {
                    asset.Url = comfyApiBaseUrl.CombineWith(asset.Url);
                }
            }
        }

        if (elPrompt.TryGetValue("prompt", out var objPromptTuple) && objPromptTuple is List<object> promptTuple)
        {
            if (promptTuple.Count > 3)
            {
                var extraData = promptTuple[3];
                if (extraData is Dictionary<string, object?> extraDataDict)
                {
                    if (extraDataDict.TryGetValue("client_id", out var oClientId))
                    {
                        ret.ClientId = oClientId?.ToString();
                    }
                }
            }
        }
        if (elPrompt.TryGetValue("status", out var oStatus) && oStatus is Dictionary<string, object?> status)
        {
            ret.Duration = GetDuration(status);
        }
        return ret;
    }
    
    public class AudioCategory
    {
        public const string Music = "Music";
        public const string Soundtrack = "Soundtrack";
        public const string SoundEffect = "Sound effect";
        public const string Speech = "Speech";
        public const string Nature = "Nature";
        
        // Sub category
        public const string Guitar = "Guitar";
        public const string Piano = "Piano";
        public const string Organ = "Organ";
        public const string Electronica = "Electronica";
        public const string Classical = "Classical";
        public const string VideoGame = "Video game";
    }

    public static Dictionary<string, string> AudioMajorCategories { get; set; } = new()
    {
        // ["Music"] = "Music",
        ["Keyboard (musical)"] = AudioCategory.Music,
        ["Musical instrument"] = AudioCategory.Music,
        ["Pop music"] = AudioCategory.Music,
        ["House music"] = AudioCategory.Music,
        ["Dance music"] = AudioCategory.Music,
        ["Trance music"] = AudioCategory.Music,
        ["Soul music"] = AudioCategory.Music,
        ["Jingle, tinkle"] = AudioCategory.Music,
        ["Jingle (music)"] = AudioCategory.Music,
        ["Electronic music"] = AudioCategory.Music,
        ["Christian music"] = AudioCategory.Music,
        ["Christmas music"] = AudioCategory.Music,
        ["Music for children"] = AudioCategory.Music,
        ["Folk music"] = AudioCategory.Music,
        ["Hip hop music"] = AudioCategory.Music,
        ["Exciting music"] = AudioCategory.Music,
        ["Electronic dance music"] = AudioCategory.Music,
        ["Soundtrack music"] = AudioCategory.Soundtrack,
        ["Ambient music"] = AudioCategory.Soundtrack,
        ["Background music"] = AudioCategory.Soundtrack,
        ["Theme music"] = AudioCategory.Soundtrack,
        ["Sound effect"] = AudioCategory.SoundEffect,
        ["Explosion"] = AudioCategory.SoundEffect,
        ["Eruption"] = AudioCategory.SoundEffect,
        ["Fire"] = AudioCategory.SoundEffect,
        ["Rain"] = AudioCategory.SoundEffect,
        ["Water"] = AudioCategory.SoundEffect,
        ["Raindrop"] = AudioCategory.SoundEffect,
        ["Rustling leaves"] = AudioCategory.SoundEffect,
        ["Car"] = AudioCategory.SoundEffect,
        ["Vehicle"] = AudioCategory.SoundEffect,
        ["Narration, monologue"] = AudioCategory.Speech,
        ["Speech"] = AudioCategory.Speech,
        ["Child speech, kid speaking"] = AudioCategory.Speech,
        ["Environmental noise"] = AudioCategory.Nature,
        ["Outside, rural or natural"] = AudioCategory.Nature,
        ["Bird"] = AudioCategory.Nature,
        ["Animal"] = AudioCategory.Nature,
        ["Insect"] = AudioCategory.Nature,
        ["Cricket"] = AudioCategory.Nature,
        ["Wild animals"] = AudioCategory.Nature,
        ["Bird vocalization, bird call, bird song"] = AudioCategory.Nature,
        ["Chirp, tweet"] = AudioCategory.Nature,
        ["Snake"] = AudioCategory.Nature,
        ["Frog"] = AudioCategory.Nature,
        ["Livestock, farm animals, working animals"] = AudioCategory.Nature,
    };

    public static Dictionary<string, string> AudioSubCategories { get; set; } = new()
    {
        ["Guitar"] = AudioCategory.Guitar,
        ["Acoustic guitar"] = AudioCategory.Guitar,
        ["Steel guitar, slide guitar"] = AudioCategory.Guitar,
        ["Bass guitar"] = AudioCategory.Guitar,
        ["Ukulele"] = AudioCategory.Guitar,
        ["Plucked string instrument"] = AudioCategory.Guitar,
        ["Mandolin"] = AudioCategory.Guitar,
        ["Piano"] = AudioCategory.Piano,
        ["Electric piano"] = AudioCategory.Piano,
        ["Organ"] = AudioCategory.Organ,
        ["Electronic organ"] = AudioCategory.Organ,
        ["Hammond organ"] = AudioCategory.Organ,
        ["Electronica"] = AudioCategory.Electronica,
        ["Electronic music"] = AudioCategory.Electronica,
        ["Trance music"] = AudioCategory.Electronica,
        ["Electronic dance music"] = AudioCategory.Electronica,
        ["Synthesizer"] = AudioCategory.Electronica,
        ["Dubstep"] = AudioCategory.Electronica,
        ["Sampler"] = AudioCategory.Electronica,
        ["Techno"] = AudioCategory.Electronica,
        ["Violin, fiddle"] = AudioCategory.Classical,
        ["Wind instrument, woodwind instrument"] = AudioCategory.Classical,
        ["Video game music"] = AudioCategory.VideoGame,
    };

    public static Dictionary<string, double>? GetAudioCategories(Dictionary<string, double> tags)
    {
        var categories = new Dictionary<string, double>();
        foreach (var tag in tags)
        {
            if (AudioMajorCategories.TryGetValue(tag.Key, out var category))
            {
                categories[category] = tag.Value.ConvertTo<double>();
                break;
            }
        }
        foreach (var tag in tags)
        {
            if (AudioSubCategories.TryGetValue(tag.Key, out var category))
            {
                categories[category] = tag.Value.ConvertTo<double>();
                break;
            }
        }
        return categories.Count > 0 
            ? categories 
            : null;
    }

    public static WorkflowResult GetOutputs(Dictionary<string, object?> outputs, Rating minRating)
    {
        var ret = new WorkflowResult();
        // Iterate through all output nodes
        foreach (var nodeOutput in outputs)
        {
            var nodeId = nodeOutput.Key;
            if (nodeOutput.Value is Dictionary<string, object?> nodeOutputs)
            {
                // Extract Node Images
                if (nodeOutputs.TryGetValue("images", out var oImagesArray) &&
                    oImagesArray is List<object> imagesArray)
                {
                    ret.Assets ??= [];
                    foreach (var oImage in imagesArray)
                    {
                        var image = (Dictionary<string, object?>)oImage;
                        if (image.TryGetValue("filename", out var oFilename) && oFilename is string filename &&
                            image.TryGetValue("type", out var oType))
                        {
                            if (string.IsNullOrEmpty(filename)) continue;

                            image.TryGetValue("subfolder", out var elSubFolder);

                            var mimeType = MimeTypes.GetMimeType(filename);
                            var assetType = mimeType.StartsWith("image")
                                ? AssetType.Image
                                : mimeType.StartsWith("video")
                                    ? AssetType.Video
                                    : mimeType.StartsWith("audio")
                                        ? AssetType.Audio
                                        : mimeType.StartsWith("text")
                                            ? AssetType.Text
                                            : AssetType.Binary;
                            
                            /* ratings format: {
                                 "predicted_rating" : "R",
                                 "confidence" : 0.2354736328125,
                                 "all_scores" : {
                                   "G" : 0.2200927734375,
                                   "PG" : 0.2335205078125,
                                   "PG-13" : 0.2177734375,
                                   "R" : 0.2354736328125,
                                   "X" : 0.232666015625,
                                   "XXX" : 0.230712890625
                                 }
                               }
                            */
                            Ratings? ratings = null;
                            if (image.TryGetValue("ratings", out var oRatings) &&
                                oRatings is Dictionary<string, object?> obj)
                            {
                                ratings = new Ratings
                                {
                                    PredictedRating = obj.GetValueOrDefault("predicted_rating")?.ToString(),
                                    Confidence = obj.GetValueOrDefault("confidence")?.ConvertTo<double>() ?? 0,
                                    AllScores = obj.GetValueOrDefault("all_scores") is Dictionary<string, object?> allScores
                                        ? allScores.ToDictionary(x => x.Key, x => x.Value.ConvertTo<double>())
                                        : new(),
                                };
                            }

                            /* categories format: {
                                "cat1": 0.5,
                                "cat2": 0.3,
                                "cat3": 0.2
                               }
                             */
                            Dictionary<string,double>? categories = null;
                            if (image.TryGetValue("categories", out var oCategories) &&
                                oCategories is Dictionary<string, object?> categoriesDict)
                            {
                                categories = new();
                                foreach (var tag in categoriesDict)
                                {
                                    categories[tag.Key] = tag.Value.ConvertTo<double>();
                                }
                            }

                            /* tags format: {
                                "tag1": 0.5,
                                "tag2": 0.3,
                                "tag3": 0.2
                               }
                             */
                            Dictionary<string,double>? tags = null;
                            if (image.TryGetValue("tags", out var oTags) &&
                                oTags is Dictionary<string, object?> tagsDict)
                            {
                                tags = new();
                                foreach (var tag in tagsDict)
                                {
                                    tags[tag.Key] = tag.Value.ConvertTo<double>();
                                }
                            }
                            
                            /* objects format: [
                                 { "model": "nudenet", "class": "class_name", "score": 0.5, "box": [0, 0, 1, 1] },
                                 { "model": "erax",    "class": "class_name", "score": 0.3, "box": [0, 0, 1, 1] },
                               ]
                             */
                            List<ObjectDetection>? objects = null;
                            if (image.TryGetValue("objects", out var oObjects) &&
                                oObjects is List<object> objectsArray)
                            {
                                objects = [];
                                foreach (var oObject in objectsArray)
                                {
                                    if (oObject is Dictionary<string, object?> objectDict)
                                    {
                                        var objDetection = objectDict.FromObjectDictionary<ObjectDetection>();
                                        objects.Add(objDetection);
                                    }
                                }
                            }
                            
                            var perceptualHash = image.TryGetValue("phash", out var oPhash) 
                                ? oPhash?.ToString() 
                                : null;
                            var color = image.TryGetValue("color", out var oColor) 
                                ? oColor?.ToString() 
                                : null;

                            var path = "/view"
                                .AddQueryParam("filename", filename)
                                .AddQueryParam("type", oType?.ToString() ?? "")
                                .AddQueryParam("subfolder", elSubFolder?.ToString() ?? "");

                            var asset = new ComfyAssetOutput
                            {
                                NodeId = nodeId,
                                Type = assetType,
                                FileName = filename,
                                Url = path,
                                Categories = categories,
                                Tags = tags,
                                Ratings = ratings,
                                Objects = objects,
                                Phash = perceptualHash,
                                Color = color,
                            };
                            asset.Rating = asset.ToAssetRating(minRating);
                            ret.Assets.Add(asset);
                        }
                    }
                }

                if (nodeOutputs.TryGetValue("audio", out var oAudioArray) && oAudioArray is List<object> audioArray)
                {
                    ret.Assets ??= [];
                    foreach (var audio in audioArray)
                    {
                        if (audio is Dictionary<string, object?> audioDict)
                        {
                            if (audioDict.TryGetValue("filename", out var oFilename) && oFilename is string filename &&
                                audioDict.TryGetValue("type", out var oType))
                            {
                                if (string.IsNullOrEmpty(filename)) continue;

                                audioDict.TryGetValue("subfolder", out var elSubFolder);

                                var path = "/view"
                                    .AddQueryParam("filename", filename)
                                    .AddQueryParam("type", oType?.ToString() ?? "")
                                    .AddQueryParam("subfolder", elSubFolder?.ToString() ?? "");

                                var asset = new ComfyAssetOutput
                                {
                                    NodeId = nodeId,
                                    Type = AssetType.Audio,
                                    FileName = filename,
                                    Url = path,
                                };

                                if (audioDict.TryGetValue("codec", out var oCodec))
                                    asset.Codec = oCodec?.ToString();
                                if (audioDict.TryGetValue("duration", out var oDuration))
                                    asset.Duration = oDuration?.ConvertTo<double>();
                                if (audioDict.TryGetValue("bitrate", out var oBitrate))
                                    asset.Bitrate = oBitrate?.ConvertTo<int>();
                                if (audioDict.TryGetValue("streams", out var oStreams))
                                    asset.Streams = oStreams?.ConvertTo<int>();
                                if (audioDict.TryGetValue("programs", out var oPrograms))
                                    asset.Programs = oPrograms?.ConvertTo<int>();
                                

                                /* tags format: {
                                    "tag1": 0.5,
                                    "tag2": 0.3,
                                    "tag3": 0.2
                                   }
                                 */
                                Dictionary<string,double>? tags = null;
                                if (audioDict.TryGetValue("tags", out var oTags) &&
                                    oTags is Dictionary<string, object?> tagsDict)
                                {
                                    tags = new();
                                    foreach (var tag in tagsDict)
                                    {
                                        tags[tag.Key] = tag.Value.ConvertTo<double>();
                                    }
                                    asset.Tags = tags;
                                }

                                /* categories format: {
                                    "cat1": 0.5,
                                    "cat2": 0.3,
                                    "cat3": 0.2
                                   }
                                 */
                                Dictionary<string,double>? categories = null;
                                if (audioDict.TryGetValue("categories", out var oCategories) &&
                                    oCategories is Dictionary<string, object?> categoriesDict)
                                {
                                    categories = new();
                                    foreach (var tag in categoriesDict)
                                    {
                                        categories[tag.Key] = tag.Value.ConvertTo<double>();
                                    }
                                    asset.Categories = categories;
                                }
                                else if (asset.Tags != null)
                                {
                                    asset.Categories = GetAudioCategories(asset.Tags);
                                }
                                
                                ret.Assets.Add(asset);
                            }
                        }
                    }
                }

                if (nodeOutputs.TryGetValue("text", out var oTextArray) && oTextArray is List<object> textArray)
                {
                    ret.Texts ??= [];
                    foreach (var text in textArray)
                    {
                        ret.Texts.Add(new()
                        {
                            NodeId = nodeId,
                            Text = text.ToString()
                        });
                    }
                }
                
            }
        }

        return ret;
    }

    public static TimeSpan? GetDuration(Dictionary<string, object?> status)
    {
        long startTimestamp = 0;
        long endTimestamp = 0;

        if (status.TryGetValue("messages", out var oMessages) && oMessages is List<object> messages)
        {
            foreach (var message in messages)
            {
                var messageTuple = (List<object>)message;
                var messageType = messageTuple[0].ToString();
                if (messageTuple[1] is Dictionary<string, object?> msgData)
                {
                    if (messageType == "execution_start")
                    {
                        startTimestamp = msgData.GetValueOrDefault("timestamp").ConvertTo<long>();
                    }
                    else if (messageType == "execution_success")
                    {
                        endTimestamp = msgData.GetValueOrDefault("timestamp").ConvertTo<long>();
                    }
                }
            }
            if (startTimestamp > 0 && endTimestamp > 0)
            {
                return TimeSpan.FromMilliseconds(endTimestamp - startTimestamp);
            }
        }
        return null;
    }
}
