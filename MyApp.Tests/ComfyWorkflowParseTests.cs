using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using NUnit.Framework;
using ServiceStack;
using ServiceStack.Text;
using MyApp.ServiceInterface;
using MyApp.ServiceModel;

namespace MyApp.Tests;

public class ComfyWorkflowParseTests
{
    private IServiceProvider serviceProvider;
    string ComfyEndpoint = "http://localhost:7860";
    private string ApiKey = Environment.GetEnvironmentVariable("AI_SERVER_API_KEY");
    private Dictionary<string, NodeInfo> NodeDefs;
    string ObjectInfoPath = Path.Combine(AppContext.BaseDirectory, "../../../files/object_info.json");
    private string ObjectInfoJson;

    public ComfyWorkflowParseTests()
    {
        var services = new ServiceCollection();
        services.AddHttpClient(nameof(ComfyGateway));
        serviceProvider = services.BuildServiceProvider();

        ObjectInfoJson = File.ReadAllText(ObjectInfoPath);
        NodeDefs = ComfyMetadata.Instance.LoadObjectInfo(ObjectInfoJson, ComfyEndpoint);
    }

    ComfyGateway CreateGateway() => new(NullLogger<ComfyGateway>.Instance, serviceProvider.GetRequiredService<IHttpClientFactory>(), ComfyMetadata.Instance);
    
    [Test]
    [Explicit("Integration tests")]
    public async Task Can_parse_json()
    {
        var json = await File.ReadAllTextAsync(ObjectInfoPath);
        var doc = System.Text.Json.JsonDocument.Parse(json);
        var obj = doc.RootElement.AsObject();
        if (obj is Dictionary<string, object> dict)
        {
            if (dict.GetValueOrDefault("id") is int id)
            {
            }
            if (dict.GetValueOrDefault("name") is string name)
            {
            }

            var seed = dict.GetValueOrDefault("seed").ConvertTo<long>();
        }
        obj.PrintDump();
    }
    
    [Test]
    [Explicit("Integration tests")]
    public async Task Can_get_Workflows()
    {
        var comfy = CreateGateway();
        var ret = await comfy.GetWorkflowsAsync(ComfyEndpoint, ApiKey);
        ret.PrintDump();
    }
    
    [Test]
    [Explicit("Integration tests")]
    public async Task Can_get_basic_Workflow()
    {
        var comfy = CreateGateway();
        var ret = await comfy.GetWorkflowJsonAsync(ComfyEndpoint, ApiKey, "basic.json");
        Assert.That(ret.Length, Is.GreaterThan(1000));
    }

    [Test]
    public void Can_ParseModels()
    {
        var models = ComfyMetadata.ParseModels(ObjectInfoJson);
        models.PrintDump();
    }

    [Test]
    public void Can_parse_basic_Workflow()
    {
        var workflowPath = "./workflows/text-to-image/basic.json";
        var workflowJson = File.ReadAllText(workflowPath);
        var workflow = ComfyWorkflowParser.Parse(workflowJson.ParseAsObjectDictionary(), "basic.json", NodeDefs) ?? throw new Exception($"Could not parse {workflowPath}");
        var inputNames = workflow.Inputs.Map(x => x.Name);
        Assert.That(workflow.Type, Is.EqualTo(ComfyWorkflowType.TextToImage));
        Assert.That(inputNames,Is.EquivalentTo("positivePrompt,negativePrompt,width,height,batch_size,seed,steps,cfg,sampler_name,scheduler,denoise".Split(',')));
    }

    [Test]
    public void Can_parse_dreamShaperXL_Workflow()
    {
        var workflowPath = "./workflows/text-to-image/dreamshaperXL.json";
        var workflowJson = File.ReadAllText(workflowPath);
        var workflow = ComfyWorkflowParser.Parse(workflowJson.ParseAsObjectDictionary(), workflowPath.LastRightPart('/'), NodeDefs) ?? throw new Exception($"Could not parse {workflowPath}");
        var inputNames = workflow.Inputs.Map(x => x.Name);
        Assert.That(workflow.Type, Is.EqualTo(ComfyWorkflowType.TextToImage));
        Assert.That(inputNames,Is.EquivalentTo("positivePrompt,negativePrompt,width,height,batch_size,seed,steps,cfg,sampler_name,scheduler,denoise".Split(',')));
    }

    [Test]
    public void Can_parse_fluxSchnell_Workflow()
    {
        var workflowPath = "./workflows/text-to-image/flux1-schnell.json";
        var workflowJson = File.ReadAllText(workflowPath);
        var workflow = ComfyWorkflowParser.Parse(workflowJson.ParseAsObjectDictionary(), workflowPath.LastRightPart('/'), NodeDefs) ?? throw new Exception($"Could not parse {workflowPath}");
        var inputNames = workflow.Inputs.Map(x => x.Name);
        Assert.That(workflow.Type, Is.EqualTo(ComfyWorkflowType.TextToImage));
        Assert.That(inputNames,Is.EquivalentTo("positivePrompt,width,height,batch_size,noise_seed,sampler_name,scheduler,steps,denoise".Split(',')));
    }

    [Test]
    public void Can_parse_Hidream_dev_Workflow()
    {
        var workflowPath = "./workflows/text-to-image/hidream_i1_dev_fp8.json";
        var workflowJson = File.ReadAllText(workflowPath);
        var workflow = ComfyWorkflowParser.Parse(workflowJson.ParseAsObjectDictionary(), workflowPath.LastRightPart('/'), NodeDefs) ?? throw new Exception($"Could not parse {workflowPath}");
        var inputNames = workflow.Inputs.Map(x => x.Name);
        workflow.PrintDump();
        Assert.That(workflow.Type, Is.EqualTo(ComfyWorkflowType.TextToImage));
        Assert.That(inputNames,Is.EquivalentTo("positivePrompt,negativePrompt,width,height,batch_size,seed,steps,cfg,sampler_name,scheduler,denoise".Split(',')));
    }

    [Test]
    public void Can_parse_flux_krea_dev_Workflow()
    {
        var workflowPath = "./workflows/text-to-image/flux1-krea-dev.json";
        var workflowJson = File.ReadAllText(workflowPath);
        var workflow = ComfyWorkflowParser.Parse(workflowJson.ParseAsObjectDictionary(), workflowPath.LastRightPart('/'), NodeDefs) ?? throw new Exception($"Could not parse {workflowPath}");
        var inputNames = workflow.Inputs.Map(x => x.Name);
        Assert.That(workflow.Type, Is.EqualTo(ComfyWorkflowType.TextToImage));
        Assert.That(inputNames,Is.EquivalentTo("positivePrompt,width,height,batch_size,seed,cfg,sampler_name,scheduler,steps,denoise".Split(',')));
    }

    [Test]
    public void Can_parse_all_SDXL_Workflows()
    {
        string[] workflows = [
            "dreamshaperXL",
            "hidream_i1_dev_fp8",
            "hidream_i1_fast_fp8",
            "jibMixRealisticXL",
            "juggernautXL",
            "realvisxl",
            "sd3.5_large",
            "sd3.5_large_fp8_scaled",
            "sd3.5_large_turbo",
            "sdxl_lightning_4step",
        ];

        foreach (var fileName in workflows)
        {
            var workflowPath = $"./workflows/text-to-image/{fileName}.json";
            Console.WriteLine("Parsing {0}...", workflowPath);
            var workflowJson = File.ReadAllText(workflowPath);
            var workflow = ComfyWorkflowParser.Parse(workflowJson.ParseAsObjectDictionary(), workflowPath.LastRightPart('/'), NodeDefs) ?? throw new Exception($"Could not parse {workflowPath}");
            var inputNames = workflow.Inputs.Map(x => x.Name);
            // workflow.PrintDump();
            Assert.That(workflow.Type, Is.EqualTo(ComfyWorkflowType.TextToImage));
            Assert.That(inputNames,Is.EquivalentTo("positivePrompt,negativePrompt,width,height,batch_size,seed,steps,cfg,sampler_name,scheduler,denoise".Split(',')));
        }
    }

    [Test]
    public void Can_parse_stable_audio_Workflow()
    {
        var workflowPath = "./workflows/text-to-audio/stable_audio.json";
        var workflowJson = File.ReadAllText(workflowPath);
        var workflow = ComfyWorkflowParser.Parse(workflowJson.ParseAsObjectDictionary(), workflowPath.LastRightPart('/'), NodeDefs) ?? throw new Exception($"Could not parse {workflowPath}");
        var inputNames = workflow.Inputs.Map(x => x.Name);
        workflow.PrintDump();
        Assert.That(workflow.Type, Is.EqualTo(ComfyWorkflowType.TextToAudio));
        Assert.That(inputNames,Is.EquivalentTo("positivePrompt,negativePrompt,seconds,batch_size,seed,steps,cfg,sampler_name,scheduler,denoise".Split(',')));
    }

    [Test]
    public void Can_parse_florence2_Workflow()
    {
        var workflowPath = "./workflows/image-to-text/florence2.json";
        var workflowJson = File.ReadAllText(workflowPath);
        var workflow = ComfyWorkflowParser.Parse(workflowJson.ParseAsObjectDictionary(), workflowPath.LastRightPart('/'), NodeDefs) ?? throw new Exception($"Could not parse {workflowPath}");
        var inputNames = workflow.Inputs.Map(x => x.Name);
        workflow.PrintDump();
        Assert.That(workflow.Type, Is.EqualTo(ComfyWorkflowType.ImageToText));
        Assert.That(inputNames,Is.EquivalentTo("image,text_input,task,fill_mask".Split(',')));
    }

    [Test]
    public void Can_parse_image2image_Workflow()
    {
        var workflowPath = "./workflows/image-to-image/sd1.5_pruned_emaonly.json";
        var workflowJson = File.ReadAllText(workflowPath);
        var workflow = ComfyWorkflowParser.Parse(workflowJson.ParseAsObjectDictionary(), workflowPath.LastRightPart('/'), NodeDefs) ?? throw new Exception($"Could not parse {workflowPath}");
        var inputNames = workflow.Inputs.Map(x => x.Name);
        workflow.PrintDump();
        Assert.That(workflow.Type, Is.EqualTo(ComfyWorkflowType.ImageToImage));
        Assert.That(inputNames,Is.EquivalentTo("image,positivePrompt,negativePrompt,seed,steps,cfg,sampler_name,scheduler,denoise".Split(',')));
    }

    [Test]
    public void Can_parse_audio2text_Workflow()
    {
        var workflowPath = "./workflows/audio-to-text/transcribe-audio-whisper.json";
        var workflowJson = File.ReadAllText(workflowPath);
        var workflow = ComfyWorkflowParser.Parse(workflowJson.ParseAsObjectDictionary(), workflowPath.LastRightPart('/'), NodeDefs) ?? throw new Exception($"Could not parse {workflowPath}");
        var inputNames = workflow.Inputs.Map(x => x.Name);
        workflow.PrintDump();
        Assert.That(workflow.Type, Is.EqualTo(ComfyWorkflowType.AudioToText));
        Assert.That(inputNames,Is.EquivalentTo("audio".Split(',')));
    }

    [Test]
    public void Can_parse_text2audio_AceStep_Workflow()
    {
        var workflowPath = "./workflows/text-to-audio/ace-step.json";
        var workflowJson = File.ReadAllText(workflowPath);
        var workflow = ComfyWorkflowParser.Parse(workflowJson.ParseAsObjectDictionary(), workflowPath.LastRightPart('/'), NodeDefs) ?? throw new Exception($"Could not parse {workflowPath}");
        var inputNames = workflow.Inputs.Map(x => x.Name);
        // inputNames.PrintDump();
        // workflow.PrintDump();
        Assert.That(workflow.Type, Is.EqualTo(ComfyWorkflowType.TextToAudio));
        Assert.That(inputNames,Is.EquivalentTo("tags,lyrics,lyrics_strength,seed,steps,cfg,sampler_name,scheduler,denoise,batch_size,seconds".Split(',')));
    }

    [Test]
    public void Can_parse_image2video_wan_Workflow()
    {
        var workflowPath = "./workflows/image-to-video/wan.json";
        var workflowJson = File.ReadAllText(workflowPath);
        var workflow = ComfyWorkflowParser.Parse(workflowJson.ParseAsObjectDictionary(), workflowPath.LastRightPart('/'), NodeDefs) ?? throw new Exception($"Could not parse {workflowPath}");
        var inputNames = workflow.Inputs.Map(x => x.Name);
        Assert.That(inputNames,Is.EquivalentTo(
            "positivePrompt,negativePrompt,seed,steps,cfg,sampler_name,scheduler,denoise,image".Split(',')));
        Assert.That(workflow.Type, Is.EqualTo(ComfyWorkflowType.ImageToVideo));

        var positiveInput = workflow.Inputs.First(x => x.Name == "positivePrompt");
        Assert.That(positiveInput.ClassType, Is.EqualTo("CLIPTextEncode"));
        Assert.That(positiveInput.Default, Is.EqualTo("a cute anime girl with massive fennec ears and a big fluffy tail wearing a maid outfit turning around"));

        var negativeInput = workflow.Inputs.First(x => x.Name == "negativePrompt");
        Assert.That(negativeInput.ClassType, Is.EqualTo("CLIPTextEncode"));
        Assert.That(negativeInput.Default, Is.EqualTo("Vibrant colors, overexposure, static, blurred details, subtitles, style, artwork, painting, still image, overall grayness, worst quality, low quality, JPEG compression residue, ugly, mutilated, extra fingers, poorly drawn hands, poorly drawn faces, deformed, disfigured, malformed limbs, fused fingers, still image, cluttered background, three legs, crowded background, walking backwards"));

        // workflow.PrintDump();
    }

    [Test]
    public void Can_parse_video2text_Workflow()
    {
        var workflowPath = "./workflows/video-to-text/transcribe-video-whisper.json";
        var workflowJson = File.ReadAllText(workflowPath);
        var workflow = ComfyWorkflowParser.Parse(workflowJson.ParseAsObjectDictionary(), workflowPath.LastRightPart('/'), NodeDefs) ?? throw new Exception($"Could not parse {workflowPath}");
        var inputNames = workflow.Inputs.Map(x => x.Name);
        workflow.PrintDump();
        Assert.That(workflow.Type, Is.EqualTo(ComfyWorkflowType.VideoToText));
        Assert.That(inputNames,Is.EquivalentTo("video".Split(',')));
    }

    [Test]
    public void Can_parse_4xUpscaler()
    {
        var workflowPath = "./workflows/image-to-image/4x_upscaler.json";
        var workflowJson = File.ReadAllText(workflowPath);
        var workflow = ComfyWorkflowParser.Parse(workflowJson.ParseAsObjectDictionary(), workflowPath.LastRightPart('/'), NodeDefs) ?? throw new Exception($"Could not parse {workflowPath}");
        var inputNames = workflow.Inputs.Map(x => x.Name);
        workflow.PrintDump();
        Assert.That(workflow.Type, Is.EqualTo(ComfyWorkflowType.ImageToImage));
        Assert.That(inputNames,Is.EquivalentTo(new[]{ "positivePrompt", "negativePrompt", "image" }));
        
        var imageInput = workflow.Inputs.First(x => x.Name == "image");
        Assert.That(imageInput.Type, Is.EqualTo(ComfyInputType.Image));
        Assert.That(imageInput.Upload, Is.True);

        Assert.That(workflow.CustomNodes, Is.EquivalentTo(new[] { "ssitu/ComfyUI_UltimateSDUpscale" }));
        Assert.That(workflow.PipPackages, Is.EquivalentTo(new[] { "servicestack" }));
    }
    
}
