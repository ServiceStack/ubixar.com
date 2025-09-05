using System.Runtime.Serialization;
using ServiceStack;
using ServiceStack.DataAnnotations;

namespace MyApp.ServiceModel;

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

/// <summary>
/// https://platform.openai.com/docs/api-reference/chat/create
/// </summary>
[Tag(Tags.AiInfo)]
[Api("Given a list of messages comprising a conversation, the model will return a response.")]
[DataContract]
public class OpenAiChat
{
    [ApiMember(Description="A list of messages comprising the conversation so far.")]
    [DataMember(Name = "messages")]
    public List<OpenAiMessage> Messages { get; set; }
    
    [ApiMember(Description="ID of the model to use. See the model endpoint compatibility table for details on which models work with the Chat API")]
    [DataMember(Name = "model")]
    public string Model { get; set; }
    
    [ApiMember(Description="Number between `-2.0` and `2.0`. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.")]
    [DataMember(Name = "frequency_penalty")]
    public double? FrequencyPenalty { get; set; }

    [ApiMember(Description="Modify the likelihood of specified tokens appearing in the completion.")]
    [DataMember(Name = "logit_bias")]
    public Dictionary<int,int>? LogitBias { get; set; }
    
    [ApiMember(Description="Whether to return log probabilities of the output tokens or not. If true, returns the log probabilities of each output token returned in the content of message.")]
    [DataMember(Name = "logprobs")]
    public bool? LogProbs { get; set; }

    [ApiMember(Description="An integer between 0 and 20 specifying the number of most likely tokens to return at each token position, each with an associated log probability. logprobs must be set to true if this parameter is used.")]
    [DataMember(Name = "top_logprobs")]
    public int? TopLogProbs { get; set; }

    [ApiMember(Description="The maximum number of tokens that can be generated in the chat completion.")]
    [DataMember(Name = "max_tokens")]
    public int? MaxTokens { get; set; }
    
    [ApiMember(Description="How many chat completion choices to generate for each input message. Note that you will be charged based on the number of generated tokens across all of the choices. Keep `n` as `1` to minimize costs.")]
    [DataMember(Name = "n")]
    public int? N { get; set; }
    
    [ApiMember(Description="Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics.")]
    [DataMember(Name = "presence_penalty")]
    public double? PresencePenalty { get; set; }
    
    [ApiMember(Description="An object specifying the format that the model must output. Compatible with GPT-4 Turbo and all GPT-3.5 Turbo models newer than `gpt-3.5-turbo-1106`. Setting Type to ResponseFormat.JsonObject enables JSON mode, which guarantees the message the model generates is valid JSON.")]
    [DataMember(Name = "response_format")]
    public OpenAiResponseFormat? ResponseFormat { get; set; }
    
    [ApiMember(Description="This feature is in Beta. If specified, our system will make a best effort to sample deterministically, such that repeated requests with the same seed and parameters should return the same result. Determinism is not guaranteed, and you should refer to the system_fingerprint response parameter to monitor changes in the backend.")]
    [DataMember(Name = "seed")]
    public int? Seed { get; set; }
    
    [ApiMember(Description="Up to 4 sequences where the API will stop generating further tokens.")]
    [DataMember(Name = "stop")]
    public List<string>? Stop { get; set; }
    
    [ApiMember(Description="If set, partial message deltas will be sent, like in ChatGPT. Tokens will be sent as data-only server-sent events as they become available, with the stream terminated by a `data: [DONE]` message.")]
    [DataMember(Name = "stream")]
    public bool? Stream { get; set; }
    
    [ApiMember(Description="What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.")]
    [DataMember(Name = "temperature")]
    public double? Temperature { get; set; }
    
    [ApiMember(Description="An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered.")]
    [DataMember(Name = "top_p")]
    public double? TopP { get; set; }
    
    [ApiMember(Description="A list of tools the model may call. Currently, only functions are supported as a tool. Use this to provide a list of functions the model may generate JSON inputs for. A max of 128 functions are supported.")]
    [DataMember(Name = "tools")]
    public List<OpenAiTools>? Tools { get; set; }

    [ApiMember(Description="A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse.")]
    [DataMember(Name = "user")]
    public string? User { get; set; }
}

public class OpenAiContent
{
    [ApiMember(Description="The type of this content.")]
    public string Type { get; set; }
    [ApiMember(Description="The text of this content.")]
    public string Text { get; set; }
}

[Api("A list of messages comprising the conversation so far.")]
[DataContract]
public class OpenAiMessage
{
    [ApiMember(Description="The contents of the message.")]
    [DataMember(Name = "content")]
    public string Content { get; set; }
    
    // [ApiMember(Description="The contents of the message.")]
    // [DataMember(Name = "content")]
    // public List<OpenAiContent> content { get; set; }
    
    [ApiMember(Description="The images for the message.")]
    [DataMember(Name = "images")]
    public List<string> Images { get; set; }
    
    [ApiMember(Description="The role of the author of this message. Valid values are `system`, `user`, `assistant` and `tool`.")]
    [DataMember(Name = "role")]
    public string Role { get; set; }
    
    [ApiMember(Description="An optional name for the participant. Provides the model information to differentiate between participants of the same role.")]
    [DataMember(Name = "name")]
    public string? Name { get; set; }
    
    [ApiMember(Description="The tool calls generated by the model, such as function calls.")]
    [DataMember(Name = "tool_calls")]
    public List<ToolCall>? ToolCalls { get; set; }
    
    [ApiMember(Description="Tool call that this message is responding to.")]
    [DataMember(Name = "tool_call_id")]
    public string? ToolCallId { get; set; }
}

[DataContract]
public class OpenAiTools
{
    [ApiMember(Description="The type of the tool. Currently, only function is supported.")]
    [DataMember(Name = "type")]
    public OpenAiToolType Type { get; set; }
}

public enum OpenAiToolType
{
    [EnumMember(Value = "function")]
    Function,
}

[DataContract]
public class OpenAiToolFunction
{
    [ApiMember(Description="The name of the function to be called. Must be a-z, A-Z, 0-9, or contain underscores and dashes, with a maximum length of 64.")]
    [DataMember(Name = "name")]
    public string? Name { get; set; }

    [ApiMember(Description="A description of what the function does, used by the model to choose when and how to call the function.")]
    [DataMember(Name = "description")]
    public string? Description { get; set; }
    
    [ApiMember(Description="The parameters the functions accepts, described as a JSON Schema object. See the guide for examples, and the JSON Schema reference for documentation about the format.")]
    [DataMember(Name = "parameters")]
    public Dictionary<string,string>? Parameters { get; set; }
}

[DataContract]
public class OpenAiResponseFormat
{
    public const string Text = "text";
    public const string JsonObject = "json_object";
    
    [ApiMember(Description="An object specifying the format that the model must output. Compatible with GPT-4 Turbo and all GPT-3.5 Turbo models newer than gpt-3.5-turbo-1106.")]
    [DataMember(Name = "response_format")]
    public ResponseFormat Type { get; set; }
}

public enum ResponseFormat
{
    [EnumMember(Value = "text")]
    Text,
    [EnumMember(Value = "json_object")]
    JsonObject
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

[DataContract]
public class OpenAiChatResponse
{
    [ApiMember(Description="A unique identifier for the chat completion.")]
    [DataMember(Name = "id")]
    public string Id { get; set; }
    
    [ApiMember(Description="A list of chat completion choices. Can be more than one if n is greater than 1.")]
    [DataMember(Name = "choices")]
    public List<Choice> Choices { get; set; }
    
    [ApiMember(Description="The Unix timestamp (in seconds) of when the chat completion was created.")]
    [DataMember(Name = "created")]
    public long Created { get; set; }
    
    [ApiMember(Description="The model used for the chat completion.")]
    [DataMember(Name = "model")]
    public string Model { get; set; }
    
    [ApiMember(Description="This fingerprint represents the backend configuration that the model runs with.")]
    [DataMember(Name = "system_fingerprint")]
    public string SystemFingerprint { get; set; }
    
    [ApiMember(Description="The object type, which is always chat.completion.")]
    [DataMember(Name = "object")]
    public string Object { get; set; }
    
    [ApiMember(Description="Usage statistics for the completion request.")]
    [DataMember(Name = "usage")]
    public OpenAiUsage Usage { get; set; }
    
    [DataMember(Name = "responseStatus")]
    public ResponseStatus? ResponseStatus { get; set; }
}

[Api(Description="Usage statistics for the completion request.")]
[DataContract]
public class OpenAiUsage
{
    [ApiMember(Description="Number of tokens in the generated completion.")]
    [DataMember(Name = "completion_tokens")]
    public int CompletionTokens { get; set; }

    [ApiMember(Description="Number of tokens in the prompt.")]
    [DataMember(Name = "prompt_tokens")]
    public int PromptTokens { get; set; }
    
    [ApiMember(Description="Total number of tokens used in the request (prompt + completion).")]
    [DataMember(Name = "total_tokens")]
    public int TotalTokens { get; set; }
}

public class Choice
{
    [ApiMember(Description="The reason the model stopped generating tokens. This will be stop if the model hit a natural stop point or a provided stop sequence, length if the maximum number of tokens specified in the request was reached, content_filter if content was omitted due to a flag from our content filters, tool_calls if the model called a tool")]
    [DataMember(Name = "finish_reason")]
    public string FinishReason { get; set; }

    [ApiMember(Description="The index of the choice in the list of choices.")]
    [DataMember(Name = "index")]
    public int Index { get; set; }
    
    [ApiMember(Description="A chat completion message generated by the model.")]
    [DataMember(Name = "message")]
    public ChoiceMessage Message { get; set; }
}

[DataContract]
public class ChoiceMessage
{
    [ApiMember(Description="The contents of the message.")]
    [DataMember(Name = "content")]
    public string Content { get; set; }
    
    [ApiMember(Description="The tool calls generated by the model, such as function calls.")]
    [DataMember(Name = "tool_calls")]
    public List<ToolCall>? ToolCalls { get; set; }

    [ApiMember(Description="The role of the author of this message.")]
    [DataMember(Name = "role")]
    public string Role { get; set; }
}

[Api("The tool calls generated by the model, such as function calls.")]
[DataContract]
public class ToolCall
{
    [ApiMember(Description="The ID of the tool call.")]
    [DataMember(Name = "id")]
    public string Id { get; set; }
    
    [ApiMember(Description="The type of the tool. Currently, only `function` is supported.")]
    [DataMember(Name = "type")]
    public string Type { get; set; }
    
    [ApiMember(Description="The function that the model called.")]
    [DataMember(Name = "function")]
    public string Function { get; set; }
}

[Api("The function that the model called.")]
[DataContract]
public class ToolFunction
{
    [ApiMember(Description="The name of the function to call.")]
    [DataMember(Name = "name")]
    public string Name { get; set; }

    [ApiMember(Description="The arguments to call the function with, as generated by the model in JSON format. Note that the model does not always generate valid JSON, and may hallucinate parameters not defined by your function schema. Validate the arguments in your code before calling your function.")]
    [DataMember(Name = "arguments")]
    public string Arguments { get; set; }
}

[Api("Log probability information for the choice.")]
[DataContract]
public class Logprobs
{
    [ApiMember(Description="A list of message content tokens with log probability information.")]
    [DataMember(Name = "content")]
    public List<LogprobItem> Content { get; set; }
}

[Api("A list of message content tokens with log probability information.")]
[DataContract]
public class LogprobItem
{
    [ApiMember(Description="The token.")]
    [DataMember(Name = "token")]
    public string Token { get; set; }

    [ApiMember(Description="The log probability of this token, if it is within the top 20 most likely tokens. Otherwise, the value `-9999`.0 is used to signify that the token is very unlikely.")]
    [DataMember(Name = "logprob")]
    public double Logprob { get; set; }
    
    [ApiMember(Description="A list of integers representing the UTF-8 bytes representation of the token. Useful in instances where characters are represented by multiple tokens and their byte representations must be combined to generate the correct text representation. Can be `null` if there is no bytes representation for the token.")]
    [DataMember(Name = "bytes")]
    public byte[] Bytes { get; set; }
    
    [ApiMember(Description="List of the most likely tokens and their log probability, at this token position. In rare cases, there may be fewer than the number of requested `top_logprobs` returned.")]
    [DataMember(Name = "top_logprobs")]
    public List<LogprobItem> TopLogprobs { get; set; }
}
