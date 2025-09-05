#nullable enable

using System.Text.Json;
using System.Text.Json.Nodes;
using MyApp.ServiceInterface;
using MyApp.ServiceModel;
using NUnit.Framework;
using ServiceStack;
using ServiceStack.Text;
using JsonSerializer = ServiceStack.Text.JsonSerializer;

namespace MyApp.Tests;

[Explicit("Integration tests")]
public class NodeComfyConverterTests : TestBase
{
    [Test]
    public void Can_deserialize_Api_Prompt()
    {
        var json = """
                   {
                     "7": {
                       "inputs": {
                         "text": " A rainbow is a meteorological phenomenon that is caused by reflection, refraction, and dispersion of light in water droplets resulting in a spectrum of light appearing in the sky."
                       },
                       "class_type": "ShowText|pysssss",
                       "_meta": {
                         "title": "Show Text 🐍"
                       }
                     }
                   }
                   """;
        var apiPrompt = json.FromJson<Dictionary<string, ApiNode>>();
        apiPrompt.PrintDump();
    }

    [Test]
    public void Can_convert_workflow()
    {
        JS.Configure();
        string GetPath(string dirName, string workflowPath) =>
            $"../../../../MyApp/wwwroot/data/{dirName}/{workflowPath}";

        var path = "Text to Image/SDXL/Jib Mix Realistic v16.v1.json";
        var workflowPath = GetPath("workflows", path);
        var infoPath = GetPath("infos", path);
        var apiPromptPath = GetPath("api-prompts", path);
        
        var workflowJson = File.ReadAllText(workflowPath!);
        var infoJson = File.ReadAllText(infoPath!);
        var apiPromptJson = File.ReadAllText(apiPromptPath!);

        var workflow = JSON.parse(workflowJson);
        
        var info = infoJson.FromJson<WorkflowInfo>();
        // info.PrintDump();
        
        var apiPrompt = apiPromptJson.FromJson<Dictionary<string, ApiNode>>();
        // apiPrompt.PrintDump();

        var args = new Dictionary<string, object?>
        {
            ["positivePrompt"] = "A beautiful sunset over the mountains",
            ["negativePrompt"] = "blurry, low quality, dark",
            ["seed"] = 1234567890,
            ["steps"] = 30,
            ["cfg"] = 3.1,
            ["sampler_name"] = "dpmpp_2m_sde_gpu",
            ["scheduler"] = "karras",
            ["denoise"] = 1,
            ["width"] = 768,
            ["height"] = 1344,
            ["batch_size"] = 1,
        };

        var newPrompt = ComfyConverters.CreatePrompt(apiPrompt, info, args);
        var newPromptJson = newPrompt.ToJson();
        
        // indent JSON using System.Text.Json
        newPromptJson = System.Text.Json.JsonSerializer.Serialize(System.Text.Json.JsonSerializer.Deserialize<JsonNode>(newPromptJson),
            new JsonSerializerOptions { WriteIndented = true });

        var clientId = Guid.NewGuid().ToString("N");
        var newApiPrompt = new ApiPrompt
        {
            ClientId = clientId,
            Prompt = newPrompt,
            ExtraData = new Dictionary<string, object?>
            {
                ["extra_pnginfo"] = new Dictionary<string, object?>
                {
                    ["workflow"] = workflow
                },
                ["client_id"] = clientId,
            },
        };
        var newApiPromptJson = newApiPrompt.ToJson();

        try
        {
            var comfyBaseUrl = "http://127.0.0.1:8188";
            var responseJson = comfyBaseUrl.CombineWith("/api/prompt")
                .PostStringToUrl(requestBody:newApiPromptJson, contentType:MimeTypes.Json, accept:MimeTypes.Json,
                    responseFilter: r =>
                    {
                        var body = r.Content.ReadAsStringAsync().Result;
                        Console.WriteLine($"HTTP {r.StatusCode} {r.ReasonPhrase}\n{body}");
                    });
            Console.WriteLine(responseJson);
        }
        catch (HttpRequestException e)
        {
            Console.WriteLine(e);
            throw;
        }
        
        JS.UnConfigure();
    }

}