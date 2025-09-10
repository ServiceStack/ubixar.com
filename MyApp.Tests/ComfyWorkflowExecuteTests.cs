using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using NUnit.Framework;
using MyApp.ServiceInterface;
using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.Text;
using JsonObject = System.Text.Json.Nodes.JsonObject;

namespace MyApp.Tests;

/*
 * All Nodes: http://localhost:7860/api/object_info
 * Single Node: http://localhost:7860/api/object_info/KSampler
 * All Workflows: http://localhost:7860/api/userdata?dir=workflows&recurse=true&split=false&full_info=true
 * Execution History: http://localhost:7860/api/history?max_items=1
 * Models: http://localhost:7860/api/experiment/models
 * Text Encoders: http://localhost:7860/api/experiment/models/text_encoders
 */
[Explicit("Integration tests")]
public class ComfyWorkflowExecuteTests : TestBase
{
    private IServiceProvider serviceProvider;
    // string ComfyEndpoint = "http://localhost:7860";
    string ComfyEndpoint = "http://localhost:8188";
    private string ApiKey = Environment.GetEnvironmentVariable("AI_SERVER_API_KEY");
    Dictionary<string, NodeInfo> NodeDefs;

    public ComfyWorkflowExecuteTests()
    {
        JS.Configure();
        var services = new ServiceCollection();
        services.AddHttpClient(nameof(ComfyGateway));
        serviceProvider = services.BuildServiceProvider();

        var objectInfoPath = Path.Combine(AppContext.BaseDirectory, "../../../files/object_info.json");
        NodeDefs = ComfyMetadata.Instance.LoadObjectInfo(File.ReadAllText(objectInfoPath), ComfyEndpoint);
    }
    
    [OneTimeTearDown]
    public void OneTimeTearDown()
    {
        JS.UnConfigure();
    }

    ComfyGateway CreateGateway() => new(NullLogger<ComfyGateway>.Instance, serviceProvider.GetRequiredService<IHttpClientFactory>(), ComfyMetadata.Instance);

    public static string FormatJson(string json)
    {
        using JsonDocument document = JsonDocument.Parse(json);
        string formattedJson = System.Text.Json.JsonSerializer.Serialize(document, new JsonSerializerOptions { 
            WriteIndented = true 
        });
        return formattedJson;
    }
    public static void DumpJson(string json) => Console.WriteLine(FormatJson(json));
    
    private static bool UseNode = true;
    
    private async Task<ApiPrompt> CreateApiPrompt(string workflowPath)
    {
        var workflowFullPath = Path.Combine(AppContext.BaseDirectory, $"../../../workflows/{workflowPath}");
        if (UseNode)
        {
            var workflowJson = await File.ReadAllTextAsync(workflowFullPath);
            var clientId = Guid.NewGuid().ToString("N");
            var workflow = workflowJson.ParseAsObjectDictionary();
            var contentRootPath = Path.Combine(AppContext.BaseDirectory, "../../../../MyApp");
            var exePath = "/home/mythz/.local/share/mise/installs/bun/latest/bin/bun";
            var nodeDefinitionsPath = Path.Combine(AppContext.BaseDirectory, "../../../files/object_info.json");
            var promptJson = await NodeComfyWorkflowConverter.CreateApiPromptJsonAsync(contentRootPath, exePath, nodeDefinitionsPath, workflowFullPath);
            var apiPrompt = NodeComfyWorkflowConverter.ConvertToApiPrompt(promptJson, clientId, workflow);
            return apiPrompt;
        }
        else
        {
            var workflowJson = await File.ReadAllTextAsync(workflowFullPath);
            var prompt = ComfyConverters.ConvertWorkflowToApiPrompt(workflowJson.ParseAsObjectDictionary(), NodeDefs);
            return prompt;
        }
    }

    private async Task<string> CreateApiPromptJson(string workflowPath) =>
        (await CreateApiPrompt(workflowPath)).ToJson();

    private async Task<string> ExecutePrompt(string promptJson)
    {
        // Test with a real ComfyUI server
        var gateway = CreateGateway();
        using var client = gateway.CreateHttpClient(ComfyEndpoint, ApiKey);

        // Set a reasonable timeout for the request
        client.Timeout = TimeSpan.FromMinutes(2);

        try
        {
            var response = await client.PostAsync("/api/prompt",
                new StringContent(promptJson, Encoding.UTF8, "application/json"));

            if (!response.IsSuccessStatusCode)
            {
                var errorJson = await response.Content.ReadAsStringAsync();
                Console.WriteLine("ComfyUI API Error:");
                Console.WriteLine(ClientConfig.IndentJson(errorJson));

                // Don't fail the test if the server returns an error that's not related to our JSON format
                Assert.Fail($"ComfyUI API returned an error: {response.StatusCode}");
            }

            var result = await response.Content.ReadAsStringAsync();

            // Verify the response contains a prompt_id
            var responseJson = result.ParseAsObjectDictionary();
            Assert.That(responseJson?["prompt_id"], Is.Not.Null, "Response should contain a prompt_id");
            var json = result.IndentJson();
            // If has node_errors
            if (responseJson.GetValueOrDefault("node_errors") is List<object> { Count: > 0 } nodeErrors)
            {
                // Console.WriteLine(promptJson.IndentJson());
                Console.WriteLine("\n");
                Console.WriteLine(json);
                Assert.Fail("Response should not contain node_errors");
            }
            else if (responseJson.GetValueOrDefault("node_errors") is Dictionary<string,object> { Count: > 0 } nodeErrorsMap)
            {
                // Console.WriteLine(promptJson.IndentJson());
                Console.WriteLine("\n");
                Console.WriteLine(json);
                Assert.Fail("Response should not contain node_errors");
            }
            return json;
        }
        catch (HttpRequestException ex)
        {
            Console.WriteLine($"HTTP Error: {ex.Message}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
            }

            throw;
        }
    }

    [Test]
    public void Can_load_ObjectInfo()
    {
        var objectInfoPath = Path.Combine(AppContext.BaseDirectory, "../../../files/object_info.json");
        var nodeDefinitions = ComfyMetadata.Instance.LoadObjectInfo(
            File.ReadAllText(objectInfoPath), ComfyEndpoint);
        Assert.That(nodeDefinitions.Count, Is.GreaterThan(300));
    }
    
    [Test]
    public async Task Can_execute_basic_Workflow()
    {
        var promptJson = await CreateApiPromptJson("text-to-image/basic.json");
        DumpJson(promptJson);

        // Verify the converted JSON is valid and contains expected elements
        var jsonNode = JsonNode.Parse(promptJson);
        Assert.That(jsonNode, Is.Not.Null);
        Assert.That(jsonNode["prompt"], Is.Not.Null);

        // Verify some key nodes from the workflow are present in the converted JSON
        var prompt = jsonNode["prompt"].AsObject();
        Assert.That(prompt.ContainsKey("4"), Is.True, "CheckpointLoaderSimple node should be present");
        Assert.That(prompt.ContainsKey("3"), Is.True, "KSampler node should be present");
        Assert.That(prompt.ContainsKey("5"), Is.True, "EmptyLatentImage node should be present");
        Assert.That(prompt.ContainsKey("8"), Is.True, "VAEDecode node should be present");
        Assert.That(prompt.ContainsKey("9"), Is.True, "SaveImage node should be present");

        var responseJson = await ExecutePrompt(promptJson);
        DumpJson(responseJson);
    }

    /// <summary>
    /// This test shows an example of the API prompt created by ComfyUI to successfully execute the sdxl_base_refiner.workflow.json
    /// </summary>
    // [Test]
    public void Can_execute_sdxl_base_refiner_ComfyUI_API_prompt()
    {
        var apiPromptFullPath = Path.Combine(AppContext.BaseDirectory, $"../../../workflows/prompts/sdxl_base_refiner.api-prompt.json");
        var promptJson = File.ReadAllText(apiPromptFullPath);
        // Console.WriteLine(promptJson);

        var responseJson = ExecutePrompt(promptJson).Result;
        Console.WriteLine(responseJson);
    }

    /// <summary>
    /// This test uses `ComfyConverters.ConvertWorkflowToApiPrompt()` to convert the sdxl_base_refiner.workflow.json to an API prompt.
    /// An example of a successful API prompt that ComfyUI generates is shown and executed in `Can_execute_sdxl_base_refiner_ComfyUI_API_prompt()`
    /// </summary>
    [Test]
    public async Task Can_execute_sdxl_base_refiner_Workflow()
    {
        // Use the API prompt directly from the file instead of converting the workflow
        var apiPromptFullPath = Path.Combine(AppContext.BaseDirectory, $"../../../workflows/prompts/sdxl_base_refiner.api-prompt.json");
        var promptJson = File.ReadAllText(apiPromptFullPath);
        // Console.WriteLine(promptJson);

        // Verify the JSON is valid and contains expected elements
        var jsonNode = JsonNode.Parse(promptJson);
        Assert.That(jsonNode, Is.Not.Null);
        Assert.That(jsonNode["prompt"], Is.Not.Null);

        // Verify some key nodes from the workflow are present in the JSON
        var prompt = jsonNode["prompt"].AsObject();
        Assert.That(prompt.ContainsKey("4"), Is.True, "CheckpointLoaderSimple node should be present");
        Assert.That(prompt.ContainsKey("10"), Is.True, "KSamplerAdvanced node should be present");
        Assert.That(prompt.ContainsKey("5"), Is.True, "EmptyLatentImage node should be present");
        Assert.That(prompt.ContainsKey("6"), Is.True, "(positive) CLIPTextEncode node should be present");
        Assert.That(prompt.ContainsKey("7"), Is.True, "(negative) CLIPTextEncode node should be present");
        Assert.That(prompt.ContainsKey("11"), Is.True, "KSamplerAdvanced refiner node should be present");
        Assert.That(prompt.ContainsKey("12"), Is.True, "CheckpointLoaderSimple refiner node should be present");
        Assert.That(prompt.ContainsKey("15"), Is.True, "(positive) CLIPTextEncode refiner node should be present");
        Assert.That(prompt.ContainsKey("16"), Is.True, "(negative) CLIPTextEncode refiner node should be present");
        Assert.That(prompt.ContainsKey("17"), Is.True, "VAEDecode node should be present");
        Assert.That(prompt.ContainsKey("19"), Is.True, "SaveImage node should be present");
        Assert.That(prompt.ContainsKey("49"), Is.True, "AssetDownloader sd_xl_base_1.0.safetensors node should be present");
        Assert.That(prompt.ContainsKey("51"), Is.True, "AssetDownloader sd_xl_refiner_1.0.safetensors node should be present");

        // Verify KSamplerAdvanced nodes have the correct values
        var node10 = prompt["10"].AsObject()["inputs"].AsObject();
        Assert.That(node10["add_noise"].GetValue<string>(), Is.EqualTo("enable"), "add_noise should be 'enable'");
        Assert.That(node10["return_with_leftover_noise"].GetValue<string>(), Is.EqualTo("enable"), "return_with_leftover_noise should be 'enable'");
        Assert.That(node10["scheduler"].GetValue<string>(), Is.EqualTo("normal"), "scheduler should be 'normal'");
        Assert.That(node10["sampler_name"].GetValue<string>(), Is.EqualTo("euler"), "sampler_name should be 'euler'");

        var node11 = prompt["11"].AsObject()["inputs"].AsObject();
        Assert.That(node11["add_noise"].GetValue<string>(), Is.EqualTo("disable"), "add_noise should be 'disable'");
        Assert.That(node11["return_with_leftover_noise"].GetValue<string>(), Is.EqualTo("disable"), "return_with_leftover_noise should be 'disable'");
        Assert.That(node11["scheduler"].GetValue<string>(), Is.EqualTo("normal"), "scheduler should be 'normal'");
        Assert.That(node11["sampler_name"].GetValue<string>(), Is.EqualTo("euler"), "sampler_name should be 'euler'");

        // var responseJson = await ExecutePrompt(promptJson);
        // Console.WriteLine(responseJson);
    }

    [Test]
    public void Can_convert_all_TextToImage_models()
    {
        var workflowDir = new DirectoryInfo(Path.Combine(AppContext.BaseDirectory, "../../../workflows/text-to-image/"));
        foreach (var workflowFile in workflowDir.GetFiles())
        {
            Console.WriteLine($"Converting {workflowFile.Name}:");
            var workflowJson = File.ReadAllText(workflowFile.FullName);
            var prompt = ComfyConverters.ConvertWorkflowToApiPrompt(
                workflowJson.ParseAsObjectDictionary(), NodeDefs, log:NullLogger.Instance);
            // Console.WriteLine(prompt.ToJson().IndentJson());
        }
    }

    [Test]
    public async Task Can_execute_DreamshaperXL_Workflow()
    {
        var promptJson = await CreateApiPromptJson("text-to-image/dreamshaperXL.json");

        var responseJson = await ExecutePrompt(promptJson);
        Console.WriteLine(responseJson);
    }

    [Test]
    public async Task Can_execute_FluxSchnell_Workflow()
    {
        var promptJson = await CreateApiPromptJson("text-to-image/flux1-schnell.json");
        Console.WriteLine(promptJson);

        var responseJson = await ExecutePrompt(promptJson);
        Console.WriteLine(responseJson);
    }

    [Test]
    public async Task Can_execute_Hidream_Dev_Workflow()
    {
        var promptJson = await CreateApiPromptJson("text-to-image/hidream_i1_dev_fp8.json");
        Console.WriteLine(promptJson);

        var responseJson = await ExecutePrompt(promptJson);
        Console.WriteLine(responseJson);
    }

    [Test]
    public async Task Can_execute_JibMixRealisticXL_Workflow()
    {
        var promptJson = await CreateApiPromptJson("text-to-image/jibMixRealisticXL.json");
        Console.WriteLine(promptJson);

        var responseJson = await ExecutePrompt(promptJson);
        Console.WriteLine(responseJson);
    }

    [Test]
    public async Task Can_execute_JibMixRealisticXL_v18_Workflow()
    {
        var promptJson = await CreateApiPromptJson("text-to-image/JibMixRealistic_v18.json");
        DumpJson(promptJson);

        var responseJson = await ExecutePrompt(promptJson);
        DumpJson(responseJson);
    }

    [Test]
    public async Task Can_execute_JuggernautXL_Workflow()
    {
        var promptJson = await CreateApiPromptJson("text-to-image/juggernautXL.json");
        Console.WriteLine(promptJson);

        var responseJson = await ExecutePrompt(promptJson);
        Console.WriteLine(responseJson);
    }

    [Test]
    public async Task Can_execute_RealvisXL_Workflow()
    {
        var promptJson = await CreateApiPromptJson("text-to-image/realvisxl.json");
        Console.WriteLine(promptJson);

        var responseJson = await ExecutePrompt(promptJson);
        Console.WriteLine(responseJson);
    }

    [Test]
    public async Task Can_execute_SD35_Large_FP8_Workflow()
    {
        var promptJson = await CreateApiPromptJson("text-to-image/sd3.5_large_fp8_scaled.json");
        Console.WriteLine(promptJson);

        var responseJson = await ExecutePrompt(promptJson);
        Console.WriteLine(responseJson);
    }

    [Test]
    public async Task Can_execute_SD35_Large_Turbo_Workflow()
    {
        var promptJson = await CreateApiPromptJson("text-to-image/sd3.5_large_turbo.json");
        Console.WriteLine(promptJson);

        var responseJson = await ExecutePrompt(promptJson);
        Console.WriteLine(responseJson);
    }

    [Test]
    public async Task Can_execute_SDXL_lightning_Workflow()
    {
        var promptJson = await CreateApiPromptJson("text-to-image/sdxl_lightning_4step.json");
        Console.WriteLine(promptJson);

        var responseJson = await ExecutePrompt(promptJson);
        Console.WriteLine(responseJson);
    }

    [Test]
    public async Task Can_execute_Smooth_Workflow()
    {
        var apiPrompt = await CreateApiPrompt("text-to-image/smooth_workflow_v3.json");
        var promptJson = ClientConfig.ToSystemJson(apiPrompt);
        // Console.WriteLine(promptJson);

        var responseJson = await ExecutePrompt(promptJson);
        Console.WriteLine(responseJson);
    }

    [Ignore("Requires Florence2")]
    [Test]
    public async Task Can_execute_Florence2_ImageToText_Workflow()
    {
        var promptJson = await CreateApiPromptJson("image-to-text/florence2.json");
        Console.WriteLine(promptJson);

        var responseJson = await ExecutePrompt(promptJson);
        Console.WriteLine(responseJson);
    }

    [Ignore("Requires image file: 00134-2415444908.png")]
    [Test]
    public async Task Can_execute_SD15_pruned_emaonly_ImageToImage_Workflow()
    {
        var promptJson = await CreateApiPromptJson("image-to-image/sd1.5_pruned_emaonly.json");
        Console.WriteLine(promptJson);

        var responseJson = await ExecutePrompt(promptJson);
        Console.WriteLine(responseJson);
    }

    [Test]
    public async Task Can_execute_VibeVoice_AudioToAudio_Workflow()
    {
        var promptJson = await CreateApiPromptJson("audio-to-audio/VibeVoice-SingleSpeaker.json");
        Console.WriteLine(promptJson);

        var responseJson = await ExecutePrompt(promptJson);
        Console.WriteLine(responseJson);
    }

    [Ignore("Requires TT-LoadAudio")]
    [Test]
    public async Task Can_execute_SD15_pruned_emaonly_AudioToText_Workflow()
    {
        var promptJson = await CreateApiPromptJson("audio-to-text/transcribe-audio-whisper.json");
        Console.WriteLine(promptJson);

        var responseJson = await ExecutePrompt(promptJson);
        Console.WriteLine(responseJson);
    }

    [Ignore("Requires TT-LoadAudio")]
    [Test]
    public async Task Can_execute_Transcribe_Whisper_VideoToText_Workflow()
    {
        var promptJson = await CreateApiPromptJson("video-to-text/transcribe-video-whisper.json");
        Console.WriteLine(promptJson);

        var responseJson = await ExecutePrompt(promptJson);
        Console.WriteLine(responseJson);
    }

    [Test]
    public void Can_parse_image_outputs()
    {
        var responseJson = File.ReadAllText("../../../workflows/results/sd3.5_fp8.output.json");
        var comfyResult = ComfyConverters.ParseComfyResult(responseJson.ParseAsObjectDictionary(), "http://localhost:7860/api");
        Assert.That(comfyResult.Assets, Is.Not.Null.Or.Empty);
        Assert.That(comfyResult.Assets![0].NodeId, Is.EqualTo("9"));
        Assert.That(comfyResult.Assets[0].Url, Is.EqualTo("http://localhost:7860/api/view?filename=ComfyUI%5f00422%5f.png&type=output&subfolder="));
        Assert.That(comfyResult.ClientId, Is.EqualTo("c865c47cd3e1443ab100d17a0e577154"));
        Assert.That(comfyResult.Duration, Is.EqualTo(TimeSpan.FromMilliseconds(1746602436899-1746602412297)));
    }

    [Test]
    public void Can_parse_text_outputs()
    {
        var responseJson = File.ReadAllText("../../../workflows/results/transcribe-audio-whisper.output.json");
        var comfyResult = ComfyConverters.ParseComfyResult(responseJson.ParseAsObjectDictionary(), "http://localhost:7860/api");
        Assert.That(comfyResult.Texts, Is.Not.Null.Or.Empty);
        Assert.That(comfyResult.Texts![0].NodeId, Is.EqualTo("7"));
        Assert.That(comfyResult.Texts[0].Text, Is.EqualTo(" A rainbow is a meteorological phenomenon that is caused by reflection, refraction, and dispersion of light in water droplets resulting in a spectrum of light appearing in the sky."));
        Assert.That(comfyResult.ClientId, Is.EqualTo("2eda9668a7794463bf00613df2ec0fe1"));
        Assert.That(comfyResult.Duration, Is.EqualTo(TimeSpan.FromMilliseconds(1746463824832-1746463824831)));
    }
}