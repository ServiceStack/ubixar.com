using MyApp.ServiceModel;
using NUnit.Framework;
using ServiceStack;
using ServiceStack.Text;

namespace MyApp.Tests;

[Explicit("Integration tests")]
public class OllamaGenerateTests : TestBase
{
    const string BaseUrl = "https://localhost:5001";
    private string ApiKey = Environment.GetEnvironmentVariable("AI_SERVER_API_KEY");
    
    [Test]
    public void Can_generate_ollama_task()
    {
        var client = new JsonApiClient(BaseUrl)
        {
            BearerToken = ApiKey
        };
        
        // var ret = client.Get(new GetOllamaGenerateTask { Id = 638857614431043728 });
        // ret.PrintDump();
        
        var requestUrl = BaseUrl.CombineWith($"/api/{nameof(GetOllamaGenerateTask)}".AddQueryParam("id", 638857614431043728));
        var json = requestUrl.GetStringFromUrl(
            requestFilter:req => req.With(x => x.SetAuthBearer(ApiKey)));
        // json.Print();
        
        var ollamaResponse = "http://localhost:11434/api/generate"
            .PostStringToUrl(requestBody:json, contentType:MimeTypes.Json, accept:MimeTypes.Json);
        ollamaResponse.Print();
    }
}