using System.Runtime.Serialization;
using ServiceStack;

namespace MyApp.ServiceModel;

[ValidateApiKey]
[Tag(Tags.Agent)]
public class GetChatCompletion : IGet, IReturn<ChatCompletion>
{
    [ValidateNotEmpty, ValidateExactLength(32)]
    public string Device { get; set; }
    [ValidateNotEmpty]
    public List<string> Models { get; set; }
}

[ValidateApiKey]
[Tag(Tags.Agent)]
public class CompleteChatCompletion : ChatResponse, IPost, IReturn<EmptyResponse>
{
    [ValidateNotEmpty]
    public long RefId { get; set; }
}


[Tag(Tags.AI)]
[ValidateApiKey]
[Route("/v1/chat/completions", "POST")]
[SystemJson(UseSystemJson.Response)]
public class CreateChatCompletion : ChatCompletion, IPost, IReturn<ChatResponse>
{
    [ApiMember(Description="Provide a unique identifier to track requests")]
    public string? RefId { get; set; }
    
    [ApiMember(Description="Categorize like requests under a common group")]
    public string? Tag { get; set; }
}


/*
{
    'model': 'mistral-small3.2:24b', 
    'created_at': '2025-06-21T19:22:25.687062838Z', 
    'message': {'role': 'assistant', 'content': 'La réponse est 4.'}, 
    'done_reason': 'stop', 
    'done': True, 
    'total_duration': 8119019132, 
    'load_duration': 3657250637, 
    'prompt_eval_count': 511, 
    'prompt_eval_duration': 4042996254, 
    'eval_count': 7, 
    'eval_duration': 400910229
}
*/
