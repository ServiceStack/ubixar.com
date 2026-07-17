using System.Runtime.Serialization;
using ServiceStack;

namespace MyApp.ServiceModel;

[ValidateApiKey]
[Route("/v1/images", "POST")]
[DataContract]
public class GenerateImage : IPost, IReturn<GenerateImageResponse>
{
    [DataMember(Name = "model")]
    [ValidateNotEmpty]
    [Input(Type = "combobox", EvalAllowableValues="ApiData.ImageModels")]
    public string Model { get; set; }

    [DataMember(Name = "prompt")]
    [ValidateNotEmpty]
    public string Prompt { get; set; }

    [DataMember(Name = "resolution")]
    [Input(Type = "combobox", EvalAllowableValues="['1K','2K','4K']")]
    public string? Resolution { get; set; }
    
    [DataMember(Name = "aspect_ratio")]
    [Input(Type = "combobox", EvalAllowableValues="['1:1','2:3','3:2','3:4','4:3','9:16','16:9','21:9']")]
    public string? AspectRatio { get; set; }
    
    [DataMember(Name = "n")]
    [ValidateGreaterThanOrEqual(1)]
    [ValidateLessThanOrEqual(14)]
    public int? N { get; set; }
    
    [DataMember(Name = "input_references")]
    public List<AiImageContent>? InputReferences { get; set; }
    
    [DataMember(Name = "seed")]
    public bool? Seed { get; set; }
}

/* Example:
{
   "created": 0,
   "data": [
       {
           "b64_json": "/9j/4AAQSkZJRgABAQEBLAEsAAD......9k=",
           "media_type": "image/jpeg"
       }
   ],
   "usage": {
       "prompt_tokens": 53,
       "completion_tokens": 1582,
       "total_tokens": 1635,
       "cost": 0.03430625,
       "is_byok": false,
       "prompt_tokens_details": {
           "cached_tokens": 0,
           "cache_write_tokens": 0,
           "audio_tokens": 0,
           "video_tokens": 0
       },
       "cost_details": {
           "upstream_inference_cost": 0.03430625,
           "upstream_inference_prompt_cost": 0.00001325,
           "upstream_inference_completions_cost": 0.034293
       },
       "completion_tokens_details": {
           "reasoning_tokens": 0,
           "image_tokens": 1120
       }
   }
}
*/
public class GenerateImageResponse
{
    public long Created { get; set; }
    public List<ImageData> Data { get; set; }
    public ImageUsage Usage { get; set; }
    public ResponseStatus? ResponseStatus { get; set; }
}

[DataContract]
public class ImageData
{
    [DataMember(Name = "b64_json")]
    public string B64Json { get; set; }
    [DataMember(Name = "media_type")]
    public string MediaType { get; set; }
}

[DataContract]
public class ImageUsage
{
    [DataMember(Name = "prompt_tokens")]
    public int PromptTokens { get; set; }
    [DataMember(Name = "completion_tokens")]
    public int CompletionTokens { get; set; }
    [DataMember(Name = "total_tokens")]
    public int TotalTokens { get; set; }
    [DataMember(Name = "cost")]
    public double Cost { get; set; }
    [DataMember(Name = "is_byok")]
    public bool IsByok { get; set; }
    [DataMember(Name = "prompt_tokens_details")]
    public ImageTokenDetails PromptTokensDetails { get; set; }
    [DataMember(Name = "cost_details")]
    public ImageCostDetails CostDetails { get; set; }
    [DataMember(Name = "completion_tokens_details")]
    public ImageCompletionTokensDetails CompletionTokensDetails { get; set; }
}

[DataContract]
public class ImageTokenDetails
{
    [DataMember(Name = "cached_tokens")]
    public int CachedTokens { get; set; }
    [DataMember(Name = "cache_write_tokens")]
    public int CacheWriteTokens { get; set; }
    [DataMember(Name = "audio_tokens")]
    public int AudioTokens { get; set; }
    [DataMember(Name = "video_tokens")]
    public int VideoTokens { get; set; }
}

[DataContract]
public class ImageCostDetails
{
    [DataMember(Name = "upstream_inference_cost")]
    public double UpstreamInferenceCost { get; set; }
    [DataMember(Name = "upstream_inference_prompt_cost")]
    public double UpstreamInferencePromptCost { get; set; }
    [DataMember(Name = "upstream_inference_completions_cost")]
    public double UpstreamInferenceCompletionsCost { get; set; }
}

[DataContract]
public class ImageCompletionTokensDetails
{
    [DataMember(Name = "reasoning_tokens")]
    public int ReasoningTokens { get; set; }
    [DataMember(Name = "image_tokens")]
    public int ImageTokens { get; set; }
}