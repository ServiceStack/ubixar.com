using System.Runtime.Serialization;
using ServiceStack;
using ServiceStack.DataAnnotations;
using ServiceStack.Jobs;

namespace MyApp.ServiceModel;

[Tag(Tags.AiInfo)]
public class GetOllamaGenerationStatus : IGet, IReturn<GetOllamaGenerationStatusResponse>
{
    public long JobId { get; set; }
    public string? RefId { get; set; }
}
public class GetOllamaGenerationStatusResponse
{
    [ApiMember(Description = "Unique identifier of the background job")]
    public long JobId { get; set; }

    [ApiMember(Description = "Client-provided identifier for the request")]
    public string RefId { get; set; }

    [ApiMember(Description = "Current state of the background job")]
    public BackgroundJobState JobState { get; set; }

    [ApiMember(Description = "Current status of the generation request")]
    public string? Status { get; set; }
    
    [ApiMember(Description = "Detailed response status information")]
    public ResponseStatus? ResponseStatus { get; set; }
    
    [ApiMember(Description = "Generation result")]
    public OllamaGenerateResponse? Result { get; set; }
}


[Tag(Tags.AI)]
[ValidateApiKey]
[SystemJson(UseSystemJson.Response)]
public class QueueOllamaGeneration : IReturn<QueueOllamaGenerationResponse>
{
    public string? RefId { get; set; }
    public string? Provider { get; set; }
    public string? ReplyTo { get; set; }
    public string? Tag { get; set; }
    public OllamaGenerate Request { get; set; }
}
public class QueueOllamaGenerationResponse
{
    public long Id { get; set; }
    public string RefId { get; set; }
    
    public string StatusUrl { get; set; }
    
    public ResponseStatus? ResponseStatus { get; set; }
}

[Tag(Tags.AI)]
[ValidateApiKey]
[Route("/api/generate", "POST")]
[SystemJson(UseSystemJson.Response)]
public class OllamaGeneration : OllamaGenerate, IPost, IReturn<OllamaGenerateResponse>
{
    [ApiMember(Description="Provide a unique identifier to track requests")]
    public string? RefId { get; set; }
    
    [ApiMember(Description="Specify which AI Provider to use")]
    public string? Provider { get; set; }
    
    [ApiMember(Description="Categorize like requests under a common group")]
    public string? Tag { get; set; }
}

public static class AiTasks
{
    public const string CaptionImage = nameof(CaptionImage);
    public const string DescribeImage = nameof(DescribeImage);
    public const string OpenAiChat = nameof(OpenAiChat);
}

public class AiTaskInfo
{
    public long Id { get; set; }
    public string Model { get; set; }
    public string Task { get; set; }
    public string TaskId { get; set; }
    public TaskState State { get; set; }
    public string? Status { get; set; }   // e.g. Queued,Executing
    public string? ErrorCode { get; set; }
}

public interface IAiTask : IMeta
{
    long Id { get; set; } // PreciseTimestamp.UniqueUtcNowTicks
    string Model { get; set; }
    string Task { get; set; }
    string TaskId { get; set; }
    string? Callback { get; set; }
    string? DeviceId { get; set; }
    string? UserId { get; set; } // Owner of Device
    string? Result { get; set; }
    string? CallbackResult { get; set; }
    // TRequest Request { get; set; }
    // TResponse? Response { get; set; }
    long? ParentId { get; set; }
    string? RefId { get; set; }
    DateTime? StartedDate { get; set; } // The day the Job was started
    DateTime? CompletedDate { get; set; } // When the Job was completed
    DateTime? NotifiedDate { get; set; } // When the Job with Callback was notified
    int? RetryLimit { get; set; } // How many times to attempt to retry Job on failure, default 2
    int Attempts { get; set; }
    int DurationMs { get; set; }
    int? TimeoutSecs { get; set; }
    TaskState State { get; set; }
    string? Status { get; set; }   // e.g. Queued,Executing
    string? ReplyTo { get; set; }
    string? ErrorCode { get; set; }
    ResponseStatus? Error { get; set; }
    Dictionary<string, string>? Args { get; set; }
}

public class AiTaskBase<TRequest,TResponse> : AuditBase, IAiTask
{
    public long Id { get; set; } // Stopwatch.GetTimestamp()
    public string Model { get; set; }
    public string Task { get; set; }
    public string? TaskId { get; set; }
    public string? Callback { get; set; }
    public string? DeviceId { get; set; }
    public string? UserId { get; set; } // Owner of Device
    public TRequest Request { get; set; }
    public TResponse? Response { get; set; }
    public string? Result { get; set; }
    public string? CallbackResult { get; set; }

    public long? ParentId { get; set; }
    [Index(Unique = true)] public virtual string? RefId { get; set; }
    [Index] public DateTime? StartedDate { get; set; } // The day the Job was started
    public DateTime? CompletedDate { get; set; } // When the Job was completed
    public DateTime? NotifiedDate { get; set; } // When the Job with Callback was notified
    public int? RetryLimit { get; set; } // How many times to attempt to retry Job on failure, default 2
    public int Attempts { get; set; }
    public int DurationMs { get; set; }
    public int? TimeoutSecs { get; set; }
    public TaskState State { get; set; }
    public string? Status { get; set; }   // e.g. Queued,Executing
    public string? ReplyTo { get; set; }
    public string? ErrorCode { get; set; }
    public ResponseStatus? Error { get; set; }
    public Dictionary<string, string>? Args { get; set; }
    public Dictionary<string, string>? Meta { get; set; }    
}
public class OllamaGenerateTask : AiTaskBase<OllamaGenerate,OllamaGenerateResponse>
{
}
public class OpenAiChatTask : AiTaskBase<OpenAiChat,OpenAiChatResponse>
{
}
public enum TaskState
{
    Queued,
    Assigned,
    Started,
    Executed,
    Completed, // Callback Notified
    Failed,
    Cancelled,
}

[Api("Generate a response for a given prompt with a provided model.")]
[DataContract]
public class OllamaGenerate
{
    [ApiMember(Description="ID of the model to use. See the model endpoint compatibility table for details on which models work with the Chat API")]
    [DataMember(Name = "model")]
    public string Model { get; set; }

    [ApiMember(Description="The prompt to generate a response for")]
    [DataMember(Name = "prompt")]
    public string Prompt { get; set; }

    [ApiMember(Description="The text after the model response")]
    [DataMember(Name = "suffix")]
    public string Suffix { get; set; }

    [Input(Type = "tag"), FieldCss(Field = "col-span-12")]
    [ApiMember(Description="List of base64 images referenced in this request")]
    [DataMember(Name = "images")]
    public List<string>? Images { get; set; }

    [ApiMember(Description="The format to return a response in. Format can be `json` or a JSON schema")]
    [DataMember(Name = "format")]
    public string? Format { get; set; }
    
    [ApiMember(Description="Additional model parameters")]
    [DataMember(Name = "options")]
    public OllamaGenerateOptions? Options { get; set; }

    [ApiMember(Description="System message")]
    [DataMember(Name = "system")]
    public string? System { get; set; }

    [ApiMember(Description="The prompt template to use")]
    [DataMember(Name = "template")]
    public string? Template { get; set; }
        
    [ApiMember(Description="If set, partial message deltas will be sent, like in ChatGPT. Tokens will be sent as data-only server-sent events as they become available, with the stream terminated by a `data: [DONE]` message")]
    [DataMember(Name = "stream")]
    public bool? Stream { get; set; }
    
    [ApiMember(Description="If `true` no formatting will be applied to the prompt. You may choose to use the raw parameter if you are specifying a full templated prompt in your request to the API")]
    [DataMember(Name = "raw")]
    public bool? Raw { get; set; }

    [ApiMember(Description="Controls how long the model will stay loaded into memory following the request (default: 5m)")]
    [DataMember(Name = "keep_alive")]
    public string? keep_alive { get; set; }
    
    [Obsolete]
    [ApiMember(Description="The context parameter returned from a previous request to /generate, this can be used to keep a short conversational memory")]
    [DataMember(Name = "context")]
    public List<int>? Context { get; set; }
}

public class OllamaGenerateOptions
{
    [ApiMember(Description="Enable Mirostat sampling for controlling perplexity. (default: 0, 0 = disabled, 1 = Mirostat, 2 = Mirostat 2.0)")]
    [DataMember(Name = "mirostat")]
    public int? Mirostat { get; set; }

    [ApiMember(Description="Influences how quickly the algorithm responds to feedback from the generated text. A lower learning rate will result in slower adjustments, while a higher learning rate will make the algorithm more responsive. (Default: 0.1)")]
    [DataMember(Name = "mirostat_eta")]
    public double? MirostatEta { get; set; }

    [ApiMember(Description="Controls the balance between coherence and diversity of the output. A lower value will result in more focused and coherent text. (Default: 5.0)")]
    [DataMember(Name = "mirostat_tau")]
    public double? MirostatTau { get; set; }

    [ApiMember(Description="Sets the size of the context window used to generate the next token. (Default: 2048)")]
    [DataMember(Name = "num_ctx")]
    public int? NumCtx { get; set; }

    [ApiMember(Description="Sets how far back for the model to look back to prevent repetition. (Default: 64, 0 = disabled, -1 = num_ctx)")]
    [DataMember(Name = "repeat_last_n")]
    public int? RepeatLastN { get; set; }

    [ApiMember(Description="Sets how strongly to penalize repetitions. A higher value (e.g., 1.5) will penalize repetitions more strongly, while a lower value (e.g., 0.9) will be more lenient. (Default: 1.1)")]
    [DataMember(Name = "repeat_penalty")]
    public double? RepeatPenalty { get; set; }

    [ApiMember(Description="The temperature of the model. Increasing the temperature will make the model answer more creatively. (Default: 0.8)")]
    [DataMember(Name = "temperature")]
    public double? Temperature { get; set; }

    [ApiMember(Description="Sets the random number seed to use for generation. Setting this to a specific number will make the model generate the same text for the same prompt. (Default: 0)")]
    [DataMember(Name = "seed")]
    public int? Seed { get; set; }

    [ApiMember(Description="Sets the stop sequences to use. When this pattern is encountered the LLM will stop generating text and return. Multiple stop patterns may be set by specifying multiple separate stop parameters in a modelfile.\t")]
    [DataMember(Name = "stop")]
    public string? Stop { get; set; }

    [ApiMember(Description="Maximum number of tokens to predict when generating text. (Default: -1, infinite generation)")]
    [DataMember(Name = "num_predict")]
    public int? NumPredict { get; set; }

    [ApiMember(Description="Reduces the probability of generating nonsense. A higher value (e.g. 100) will give more diverse answers, while a lower value (e.g. 10) will be more conservative. (Default: 40)")]
    [DataMember(Name = "top_k")]
    public int? TopK { get; set; }

    [ApiMember(Description="Works together with top-k. A higher value (e.g., 0.95) will lead to more diverse text, while a lower value (e.g., 0.5) will generate more focused and conservative text. (Default: 0.9)")]
    [DataMember(Name = "top_p")]
    public double? TopP { get; set; }

    [ApiMember(Description="Alternative to the top_p, and aims to ensure a balance of quality and variety. The parameter p represents the minimum probability for a token to be considered, relative to the probability of the most likely token. For example, with p=0.05 and the most likely token having a probability of 0.9, logits with a value less than 0.045 are filtered out. (Default: 0.0)")]
    [DataMember(Name = "min_p")]
    public double? MinP { get; set; }
}

[DataContract]
public class OllamaGenerateResponse
{
    [ApiMember(Description="The model used")]
    [DataMember(Name = "model")]
    public string Model { get; set; }
    
    [ApiMember(Description="The Unix timestamp (in seconds) of when the chat completion was created.")]
    [DataMember(Name = "created_at")]
    public long CreatedAt { get; set; }
    
    [ApiMember(Description="The full response")]
    [DataMember(Name = "response")]
    public string Response { get; set; }
    
    [ApiMember(Description="Whether the response is done")]
    [DataMember(Name = "done")]
    public bool Done { get; set; }
    
    [ApiMember(Description="The reason the response completed")]
    [DataMember(Name = "done_reason")]
    public string DoneReason { get; set; }

    [ApiMember(Description="Time spent generating the response")]
    [DataMember(Name = "total_duration")]
    public int TotalDuration { get; set; }
    
    [ApiMember(Description="Time spent in nanoseconds loading the model")]
    [DataMember(Name = "load_duration")]
    public int LoadDuration { get; set; }
    
    [ApiMember(Description="Time spent in nanoseconds evaluating the prompt")]
    [DataMember(Name = "prompt_eval_count")]
    public int PromptEvalCount { get; set; }
    
    [ApiMember(Description="Time spent in nanoseconds evaluating the prompt")]
    [DataMember(Name = "prompt_eval_duration")]
    public int PromptEvalDuration { get; set; }

    [ApiMember(Description="Number of tokens in the response")]
    [DataMember(Name = "eval_count")]
    public int EvalCount { get; set; }

    [ApiMember(Description="Time in nanoseconds spent generating the response")]
    [DataMember(Name = "prompt_tokens")]
    public int PromptTokens { get; set; }
    
    [ApiMember(Description="An encoding of the conversation used in this response, this can be sent in the next request to keep a conversational memory")]
    [DataMember(Name = "context")]
    public List<int>? Context { get; set; }
    
    [DataMember(Name = "responseStatus")]
    public ResponseStatus? ResponseStatus { get; set; }
}
