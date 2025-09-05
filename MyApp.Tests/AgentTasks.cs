using MyApp.ServiceModel;
using NUnit.Framework;
using ServiceStack;

namespace MyApp.Tests;

[Explicit("Integration tests")]
public class AgentTasks : TestBase
{
    /** Initialize VMs:
     # curl -fsSL -O http://192.168.4.200:8000/comfy/init.sh && bash ./init.sh comfy1 f16764eda958450d978b28356795cf8b ak-b75b80d3a11c46e29622cdf42c8cfe2c
     # curl -fsSL -O http://192.168.4.200:8000/comfy/init.sh && bash ./init.sh comfy2 25d800787b354f04970b0c292bbf5b83 ak-8a17c7eab63c44f2a55de62d56f3a96a
     # curl -fsSL -O http://192.168.4.200:8000/comfy/init.sh && bash ./init.sh comfy3 4e05ff140a3341c8bb4f45ba28881af9 ak-acb3b15dd53046ddaca4064d1a54496e
     */
    
    record AgentInfo(string Host, string DeviceId, string ApiKey, UpdateDevice Update=null);

    private string ApiKey = Environment.GetEnvironmentVariable("AI_SERVER_API_KEY");
    
    JsonApiClient CreateClient()
    {
        var client = new JsonApiClient("https://localhost:5001");
        client.Post(new Authenticate
        {
            provider = "credentials",
            UserName = "ubixar",
            Password = "p@55wOrd",
        });
        return client;
    }

    private static AgentInfo[] Agents =
    [
        // ubixar
        new("amd",    "d09bee1cb0cc4df0984d35b052e8df18", "ak-b75b80d3a11c46e29622cdf42c8cfe2c"),
        new("comfy1", "f16764eda958450d978b28356795cf8b", "ak-b75b80d3a11c46e29622cdf42c8cfe2c",
            new UpdateDevice {
                AddModelSettings = new()
                {
                    ["checkpoints/sd3.5_large.safetensors"] = new() {
                        MaxBatchSize = 1
                    },
                    ["checkpoints/sd3.5_large_fp8_scaled.safetensors"] = new() {
                        MaxBatchSize = 1
                    },
                    ["checkpoints/sd3.5_large_turbo.safetensors"] = new() {
                        MaxBatchSize = 1
                    },
                    ["diffusion_models/flux1-schnell.safetensors"] = new() {
                        MaxBatchSize = 0
                    },
                    ["diffusion_models/hidream_i1_dev_fp8.safetensors"] = new() {
                        MaxBatchSize = 1
                    },
                    ["diffusion_models/hidream_i1_fast_fp8.safetensors"] = new() {
                        MaxBatchSize = 1
                    },
                    ["diffusion_models/hidream_i1_full_fp8.safetensors"] = new() {
                        MaxBatchSize = 1
                    },
                }
            }), 
        // timelesswinds        
        new("comfy2", "25d800787b354f04970b0c292bbf5b83", "ak-8a17c7eab63c44f2a55de62d56f3a96a",
            new UpdateDevice
            {
                AddModelSettings = new()
                {
                    ["checkpoints/sd3.5_large.safetensors"] = new() {
                        MaxBatchSize = 1
                    },
                    ["checkpoints/sd3.5_large_fp8_scaled.safetensors"] = new() {
                        MaxBatchSize = 1
                    },
                    ["checkpoints/sd3.5_large_turbo.safetensors"] = new() {
                        MaxBatchSize = 1
                    },
                    ["diffusion_models/flux1-schnell.safetensors"] = new() {
                        MaxBatchSize = 1
                    },
                    ["diffusion_models/hidream_i1_dev_fp8.safetensors"] = new() {
                        MaxBatchSize = 0
                    },
                    ["diffusion_models/hidream_i1_fast_fp8.safetensors"] = new() {
                        MaxBatchSize = 0
                    },
                    ["diffusion_models/hidream_i1_full_fp8.safetensors"] = new() {
                        MaxBatchSize = 0
                    },
                }
            }),
        // mythz
        new("comfy3", "4e05ff140a3341c8bb4f45ba28881af9", "ak-acb3b15dd53046ddaca4064d1a54496e",
            new UpdateDevice
            {
                AddModelSettings = new()
                {
                    ["checkpoints/sd3.5_large.safetensors"] = new() {
                        MaxBatchSize = 0
                    },
                    ["checkpoints/sd3.5_large_fp8_scaled.safetensors"] = new() {
                        MaxBatchSize = 0
                    },
                    ["checkpoints/sd3.5_large_turbo.safetensors"] = new() {
                        MaxBatchSize = 0
                    },
                    ["diffusion_models/flux1-schnell.safetensors"] = new() {
                        MaxBatchSize = 0
                    },
                    ["diffusion_models/hidream_i1_dev_fp8.safetensors"] = new() {
                        MaxBatchSize = 0
                    },
                    ["diffusion_models/hidream_i1_fast_fp8.safetensors"] = new() {
                        MaxBatchSize = 0
                    },
                    ["diffusion_models/hidream_i1_full_fp8.safetensors"] = new() {
                        MaxBatchSize = 0
                    },
                }
            }),
    ];
    
    [Test]
    public void Configure_ComfyAgents()
    {
        var client = CreateClient();
        foreach (var agent in Agents)
        {
            if (agent.Update != null)
            {
                agent.Update.DeviceId = agent.DeviceId;
                client.Post(agent.Update);
            }
        }
    }
}