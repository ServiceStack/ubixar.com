/*
using MyApp.ServiceModel;
using NUnit.Framework;
using ServiceStack;
using ServiceStack.Text;

namespace MyApp.Tests;

[Explicit("Integration tests")]
public class ChatCompletionTests : TestBase
{
    public record AiTaskArgs(string Model, string Endpoint, string Request, string ReplyTo);

    [Test]
    public async Task Can_send_and_complete_OpenAiChat_Task()
    {
        var client = CreateClientWithApiKey();

        "API QueueOpenAiChatCompletion".Print();
        var ret = await client.ApiAsync(new QueueOpenAiChatCompletion {
            Request = new() {
                Model = "qwen3-vl:8b",
                Messages = [
                    new() { Role = "user", Content = "Capital of France?" },
                ]
            }
        });
        ret.Response.PrintDump();
        
        var refId = ret.Response?.RefId ?? throw new ArgumentNullException("refId");
        
        $"API GetOpenAiChatStatus({refId})".Print();
        var status = await client.ApiAsync(new GetOpenAiChatStatus { RefId = refId });
        status.Response.PrintDump();
        
        $"API GetAiTaskRequest({refId})".Print();
        var result = await client.ApiAsync(new GetAiTaskRequest { RefId = refId });
        result.Response.PrintDump();
        
        $"API GetAiTasks({DeviceId},'qwen3-vl:8b','OpenAiChat')".Print();
        var api = await client.ApiAsync(new GetAiTasks {
            DeviceId = DeviceId,
            Models = ["qwen3-vl:8b"],
            Types = [AiTaskType.OpenAiChat],
        });

        api.ThrowIfError();
        if (api.Response!.Results.Count == 0)
            throw new Exception("No tasks found");

        var task = api.Response.Results[0];
        task.PrintDump();
        var args = task.Args.ToObjectDictionary().FromObjectDictionary<AiTaskArgs>();
        args.PrintDump();
            
        $"GET {BaseUrl}".Print();
        var requestJson = await BaseUrl.CombineWith(args.Request).GetJsonFromUrlAsync(requestFilter:ApiKeyFilter);
        var ollamaUrl = "http://localhost:11434".CombineWith(args.Endpoint);

        $"POST {args.Endpoint}".Print();
        var responseJson = await ollamaUrl.PostJsonToUrlAsync(requestJson);
        var response = responseJson.FromJson<OpenAiChatResponse>();
        response.PrintDump();
            
        $"POST {args.ReplyTo}".Print();
        var completeJson = await BaseUrl.CombineWith(args.ReplyTo).PostJsonToUrlAsync(response,requestFilter:ApiKeyFilter);
        completeJson.Print();
    }

    [Test]
    public async Task Can_send_OpenAiChatCompletion()
    {
        var client = CreateClientWithApiKey();

        var task = client.ApiAsync(new ChatCompletionCompletion {
            Model = "qwen3-vl:8b",
            Messages = [
                new() { Role = "user", Content = "Capital of France?" },
            ]
        });

        var done = false;
        while (!done)
        {
            if (await PerformGetAiTasks(client))
                break;
            await Task.Delay(500);
        }
        
        var api = await task;
        done = true;
        "OpenAiChatCompletion RESPONSE:".Print();
        api.ThrowIfError();
        // api.Response.PrintDump();
        var answer = api.Response?.Choices[0].Message.Content;
        answer.Print();
    }

    [Test]
    public async Task Can_send_and_complete_multiple_OpenAiChat_Task()
    {
        const int Times = 10;
        var client = CreateClientWithApiKey();

        Task QueueOpenAiRequest(int i)
        {
            return client.ApiAsync(new QueueOpenAiChatCompletion {
                Request = new() {
                    Model = "qwen3-vl:8b",
                    Messages = [
                        new() { Role = "user", Content = $"{i}+{i}*{i}-{i}=" },
                    ]
                }
            });
        }
        
        var tasks = new List<Task>();
        // Run in parallel
        for (var i = 0; i<Times; i++)
        {
            tasks.Add(QueueOpenAiRequest(i));
        }
        await Task.WhenAll(tasks);
        
        var api = await client.ApiAsync(new GetAiTasks {
            DeviceId = DeviceId,
            Models = ["qwen3-vl:8b"],
            Types = [AiTaskType.OpenAiChat],
            Take = Times,
        });

        foreach (var agentEvent in api.Response!.Results)
        {
            try
            {
                var args = agentEvent.Args.ToObjectDictionary().FromObjectDictionary<AiTaskArgs>();
                var requestJson = await BaseUrl.CombineWith(args.Request).GetJsonFromUrlAsync(requestFilter:ApiKeyFilter);
                var request = requestJson.FromJson<ChatCompletion>();
                var question = request.Messages[0].Content;

                var ollamaUrl = "http://localhost:11434".CombineWith(args.Endpoint);
                var responseJson = await ollamaUrl.PostJsonToUrlAsync(requestJson);
                var response = responseJson.FromJson<OpenAiChatResponse>();
                var answer = response.Choices[0].Message.Content;
                
                $"POST {args.ReplyTo} ({question} {answer})".Print();
                var completeJson = await BaseUrl.CombineWith(args.ReplyTo).PostJsonToUrlAsync(response,requestFilter:ApiKeyFilter);
                completeJson.Print();
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
                agentEvent.Args.PrintDump();
            }
        }
    }
    
    [Test]
    public async Task Can_complete_OpenAiChat_Task()
    {
        var client = CreateClientWithApiKey();

        while (true)
        {
            if (!await PerformGetAiTasks(client)) 
                break;
            await Task.Delay(500);
        }
    }

    private async Task<bool> PerformGetAiTasks(JsonApiClient client)
    {
        var api = client.Api(new GetAiTasks {
            DeviceId = DeviceId,
            Models = ["qwen3-vl:8b"],
            Types = [AiTaskType.OpenAiChat],
        });

        api.ThrowIfError();
        if (api.Response!.Results.Count == 0)
            return false;
            
        var task = api.Response.Results[0];
        task.PrintDump();
        var args = task.Args.ToObjectDictionary().FromObjectDictionary<AiTaskArgs>();
        args.PrintDump();
            
        var requestJson = await BaseUrl.CombineWith(args.Request).GetJsonFromUrlAsync(requestFilter:ApiKeyFilter);
        var ollamaUrl = "http://localhost:11434".CombineWith(args.Endpoint);
        var responseJson = await ollamaUrl.PostJsonToUrlAsync(requestJson);
        var response = responseJson.FromJson<OpenAiChatResponse>();
        response.PrintDump();
            
        var completeJson = await BaseUrl.CombineWith(args.ReplyTo).PostJsonToUrlAsync(response,requestFilter:ApiKeyFilter);
        completeJson.Print();
        return true;
    }
}
*/