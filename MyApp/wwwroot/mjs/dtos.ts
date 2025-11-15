/* Options:
Date: 2025-11-15 04:20:34
Version: 8.81
Tip: To override a DTO option, remove "//" prefix before updating
BaseUrl: https://ubixar.com

//GlobalNamespace: 
//MakePropertiesOptional: False
//AddServiceStackTypes: True
//AddResponseStatus: False
//AddImplicitVersion: 
//AddDescriptionAsComments: True
//IncludeTypes: 
//ExcludeTypes: 
//DefaultImports: 
*/


export interface IReturn<T>
{
    createResponse(): T;
}

export interface IReturnVoid
{
    createResponse(): void;
}

export interface IPost
{
}

export interface IHasSessionId
{
    sessionId?: string;
}

export interface IHasBearerToken
{
    bearerToken?: string;
}

export interface IGet
{
}

export interface IDeleteDb<Table>
{
}

export interface ICreateDb<Table>
{
}

export interface IPatch
{
}

export interface IDelete
{
}

export interface IPatchDb<Table>
{
}

// @DataContract
export class AuditBase
{
    // @DataMember(Order=1)
    public createdDate: string;

    // @DataMember(Order=2)
    // @Required()
    public createdBy: string;

    // @DataMember(Order=3)
    public modifiedDate: string;

    // @DataMember(Order=4)
    // @Required()
    public modifiedBy: string;

    // @DataMember(Order=5)
    public deletedDate?: string;

    // @DataMember(Order=6)
    public deletedBy?: string;

    public constructor(init?: Partial<AuditBase>) { (Object as any).assign(this, init); }
}

export class Workflow extends AuditBase
{
    public id: number;
    public category: string;
    public base: string;
    public name: string;
    public slug: string;
    public description: string;
    public pinVersionId?: number;
    public threadId?: number;
    public tags?: string[];

    public constructor(init?: Partial<Workflow>) { super(init); (Object as any).assign(this, init); }
}

export enum AssetType
{
    Image = 'Image',
    Video = 'Video',
    Audio = 'Audio',
    Animation = 'Animation',
    Text = 'Text',
    Binary = 'Binary',
}

export class ComfyTextOutput
{
    public nodeId: string;
    public text?: string;

    public constructor(init?: Partial<ComfyTextOutput>) { (Object as any).assign(this, init); }
}

export enum Rating
{
    PG = 'PG',
    PG13 = 'PG-13',
    M = 'M',
    R = 'R',
    X = 'X',
    XXX = 'XXX',
}

export class Ratings
{
    // @DataMember(Name="predicted_rating")
    public predicted_rating: string;

    public confidence: number;
    // @DataMember(Name="all_scores")
    public all_scores: { [index:string]: number; } = {};

    public constructor(init?: Partial<Ratings>) { (Object as any).assign(this, init); }
}

export class ObjectDetection
{
    public model?: string;
    public class: string;
    public score: number;
    public box: number[] = [];

    public constructor(init?: Partial<ObjectDetection>) { (Object as any).assign(this, init); }
}

export class ComfyAssetOutput implements IAssetMetadata
{
    public nodeId: string;
    public url: string;
    public type: AssetType;
    public fileName: string;
    public width?: number;
    public height?: number;
    public length?: number;
    public rating?: Rating;
    public ratings?: Ratings;
    public tags?: { [index:string]: number; };
    public categories?: { [index:string]: number; };
    public objects?: ObjectDetection[];
    public phash?: string;
    public color?: string;
    public codec?: string;
    public duration?: number;
    public bitrate?: number;
    public streams?: number;
    public programs?: number;

    public constructor(init?: Partial<ComfyAssetOutput>) { (Object as any).assign(this, init); }
}

export class WorkflowResult
{
    public clientId?: string;
    public duration?: string;
    public texts?: ComfyTextOutput[];
    public assets?: ComfyAssetOutput[];

    public constructor(init?: Partial<WorkflowResult>) { (Object as any).assign(this, init); }
}

// @DataContract
export class ResponseError
{
    // @DataMember(Order=1)
    public errorCode: string;

    // @DataMember(Order=2)
    public fieldName: string;

    // @DataMember(Order=3)
    public message: string;

    // @DataMember(Order=4)
    public meta?: { [index:string]: string; };

    public constructor(init?: Partial<ResponseError>) { (Object as any).assign(this, init); }
}

// @DataContract
export class ResponseStatus
{
    // @DataMember(Order=1)
    public errorCode: string;

    // @DataMember(Order=2)
    public message?: string;

    // @DataMember(Order=3)
    public stackTrace?: string;

    // @DataMember(Order=4)
    public errors?: ResponseError[];

    // @DataMember(Order=5)
    public meta?: { [index:string]: string; };

    public constructor(init?: Partial<ResponseStatus>) { (Object as any).assign(this, init); }
}

export class WorkflowGeneration extends AuditBase
{
    public id: string;
    public userId?: string;
    public threadId?: number;
    public workflowId: number;
    public versionId?: number;
    public output?: AssetType;
    public description?: string;
    public checkpoint?: string;
    public lora?: string;
    public embedding?: string;
    public vae?: string;
    public controlNet?: string;
    public upscaler?: string;
    public posterImage?: string;
    public args?: { [index:string]: Object; };
    public inputs?: string[];
    public requiredNodes: string[] = [];
    public requiredAssets: string[] = [];
    public deviceId?: string;
    public promptId?: string;
    public result?: WorkflowResult;
    public error?: ResponseStatus;
    public credits: number;
    public statusUpdate?: string;
    public publishedBy?: string;
    public publishedDate?: string;
    public publicThreadId?: number;
    // @Ignore()
    public userName?: string;

    // @Ignore()
    public userKarma?: number;

    public constructor(init?: Partial<WorkflowGeneration>) { super(init); (Object as any).assign(this, init); }
}

export class GpuInfo
{
    public index: number;
    public name: string;
    public total: number;
    public free: number;
    public used: number;

    public constructor(init?: Partial<GpuInfo>) { (Object as any).assign(this, init); }
}

export class ComfyAgentConfig
{
    public installModels?: boolean;
    public installNodes?: boolean;
    public installPackages?: boolean;

    public constructor(init?: Partial<ComfyAgentConfig>) { (Object as any).assign(this, init); }
}

// @DataContract
export class QueryBase
{
    // @DataMember(Order=1)
    public skip?: number;

    // @DataMember(Order=2)
    public take?: number;

    // @DataMember(Order=3)
    public orderBy?: string;

    // @DataMember(Order=4)
    public orderByDesc?: string;

    // @DataMember(Order=5)
    public include?: string;

    // @DataMember(Order=6)
    public fields?: string;

    // @DataMember(Order=7)
    public meta?: { [index:string]: string; };

    public constructor(init?: Partial<QueryBase>) { (Object as any).assign(this, init); }
}

export class QueryDb_1<T> extends QueryBase
{

    public constructor(init?: Partial<QueryDb_1<T>>) { super(init); (Object as any).assign(this, init); }
}

// @Flags()
export enum Reaction
{
    Heart = 10084,
    ThumbsUp = 128077,
    Laugh = 128514,
    Cry = 128546,
}

export class ArtifactReaction
{
    public id: number;
    public artifactId: number;
    public userId: string;
    public reaction: Reaction;
    public createdDate: string;

    public constructor(init?: Partial<ArtifactReaction>) { (Object as any).assign(this, init); }
}

export enum ReportType
{
    NeedsReview = 'NeedsReview',
    MatureContent = 'MatureContent',
    TOSViolation = 'TOSViolation',
}

export enum ReportTag
{
    Nudity = 'Nudity',
    ExplicitNudity = 'ExplicitNudity',
    SexualActs = 'SexualActs',
    AdultProducts = 'AdultProducts',
    Underwear = 'Underwear',
    Swimwear = 'Swimwear',
    PartialNudity = 'PartialNudity',
    SexyAttire = 'SexyAttire',
    SexualThemes = 'SexualThemes',
    IntenseGore = 'IntenseGore',
    GraphicViolence = 'GraphicViolence',
    WeaponRelatedViolence = 'WeaponRelatedViolence',
    SelfHarm = 'SelfHarm',
    Death = 'Death',
    EmaciatedFigures = 'EmaciatedFigures',
    DeceasedBodies = 'DeceasedBodies',
    Hanging = 'Hanging',
    Explosions = 'Explosions',
    VisuallyDisturbing = 'VisuallyDisturbing',
    OffensiveGestures = 'OffensiveGestures',
    HateSymbols = 'HateSymbols',
    NaziRelatedContent = 'NaziRelatedContent',
    RacistContent = 'RacistContent',
    ReligiousHate = 'ReligiousHate',
    HomophobicContent = 'HomophobicContent',
    TransphobicContent = 'TransphobicContent',
    SexistContent = 'SexistContent',
    ExtremistContent = 'ExtremistContent',
    DepictionOfRealPersonContent = 'DepictionOfRealPersonContent',
    FalseImpersonation = 'FalseImpersonation',
    IllegalContent = 'IllegalContent',
    DepictionOfMinor = 'DepictionOfMinor',
    ChildAbuse = 'ChildAbuse',
    Spam = 'Spam',
    ProhibitedPrompts = 'ProhibitedPrompts',
    PotentialSecurityConcern = 'PotentialSecurityConcern',
    ContentShouldBeReviewed = 'ContentShouldBeReviewed',
    IncorrectOrMisleadingContent = 'IncorrectOrMisleadingContent',
    OtherConcern = 'OtherConcern',
}

export class ModelSettings
{
    public maxBatchSize?: number;

    public constructor(init?: Partial<ModelSettings>) { (Object as any).assign(this, init); }
}

export enum BaseModel
{
    AuraFlow = 'AuraFlow',
    SDXL = 'SDXL',
    SD1 = 'SD 1.x',
    SD2 = 'SD 2.x',
    SD3 = 'SD 3',
    SD35 = 'SD 3.5',
    SD35Medium = 'SD 3.5 Medium',
    SD35Large = 'SD 3.5 Large',
    SD35LargeTurbo = 'SD 3.5 Large Turbo',
    SDXLLightning = 'SDXL Lightning',
    StableAudio = 'StableAudio',
    SVD = 'Stable Video Diffusion',
    Flux1S = 'FLUX.1 Schnell',
    Flux1D = 'Flux.1 Dev',
    Flux1Kontext = 'Flux.1 Kontext',
    HiDream = 'HiDream',
    QwenImage = 'QwenImage',
    Hunyuan1 = 'Hunyuan1',
    HunyuanVideo = 'HunyuanVideo',
    Lumina = 'Lumina',
    Pony = 'Pony',
    NoobAI = 'NoobAI',
    Illustrious = 'Illustrious',
    PixArtA = 'PixArt-α',
    PixArtE = 'PixArt-Σ',
    Kolors = 'Hunyuan 1.x',
    Mochi = 'Mochi',
    LTXV = 'LTXV',
    CogVideoX = 'CogVideoX',
    WanVideo13B = 'WanVideo 1.3B',
    WanVideo14B = 'WanVideo 14B',
    WanVideo14B480p = 'WanVideo 14B 480p',
    WanVideo14B720p = 'WanVideo 14B 720p',
    Other = 'Other',
}

export enum AgentCommands
{
    Refresh = 'Refresh',
    Register = 'Register',
    Reboot = 'Reboot',
}

export class Poco
{
    public name: string;

    public constructor(init?: Partial<Poco>) { (Object as any).assign(this, init); }
}

export class Thread extends AuditBase
{
    public id: number;
    public url: string;
    public description: string;
    public externalRef?: string;
    public viewCount: number;
    public likesCount: number;
    public commentsCount: number;
    public args?: { [index:string]: Object; };
    public refId?: number;
    public refIdStr: string;
    public closedDate?: string;
    public reactions: { [index:string]: number; } = {};
    public reactionsCount: number;

    public constructor(init?: Partial<Thread>) { super(init); (Object as any).assign(this, init); }
}

export class Comment extends AuditBase
{
    public id: number;
    public threadId: number;
    public replyId?: number;
    public content: string;
    public flagReason?: string;
    public notes?: string;
    public userId: string;
    public reactions: { [index:string]: number; } = {};
    public reactionsCount: number;

    public constructor(init?: Partial<Comment>) { super(init); (Object as any).assign(this, init); }
}

export enum PostReport
{
    Offensive = 'Offensive',
    Spam = 'Spam',
    Nudity = 'Nudity',
    Illegal = 'Illegal',
    Other = 'Other',
}

export enum ModerationDecision
{
    None = 'None',
    Approve = 'Approve',
    Deny = 'Deny',
    Flag = 'Flag',
    Delete = 'Delete',
    Ban1Day = 'Ban1Day',
    Ban1Week = 'Ban1Week',
    Ban1Month = 'Ban1Month',
    PermanentBan = 'PermanentBan',
}

export class CommentReport
{
    public id: number;
    // @References("typeof(MyApp.ServiceModel.Comment)")
    public commentId: number;

    public comment: Comment;
    public userId: string;
    public postReport: PostReport;
    public description: string;
    public createdDate: string;
    public moderation: ModerationDecision;
    public notes?: string;

    public constructor(init?: Partial<CommentReport>) { (Object as any).assign(this, init); }
}

export class CommentReaction
{
    public id: number;
    public commentId: number;
    public reaction: Reaction;
    public userId: string;
    public createdDate: string;

    public constructor(init?: Partial<CommentReaction>) { (Object as any).assign(this, init); }
}

/** @description The tool calls generated by the model, such as function calls. */
// @Api(Description="The tool calls generated by the model, such as function calls.")
// @DataContract
export class ToolCall
{
    /** @description The ID of the tool call. */
    // @DataMember(Name="id")
    // @ApiMember(Description="The ID of the tool call.")
    public id: string;

    /** @description The type of the tool. Currently, only `function` is supported. */
    // @DataMember(Name="type")
    // @ApiMember(Description="The type of the tool. Currently, only `function` is supported.")
    public type: string;

    /** @description The function that the model called. */
    // @DataMember(Name="function")
    // @ApiMember(Description="The function that the model called.")
    public function: string;

    public constructor(init?: Partial<ToolCall>) { (Object as any).assign(this, init); }
}

// @DataContract
export class ChoiceMessage
{
    /** @description The contents of the message. */
    // @DataMember(Name="content")
    // @ApiMember(Description="The contents of the message.")
    public content: string;

    /** @description The tool calls generated by the model, such as function calls. */
    // @DataMember(Name="tool_calls")
    // @ApiMember(Description="The tool calls generated by the model, such as function calls.")
    public tool_calls?: ToolCall[];

    /** @description The role of the author of this message. */
    // @DataMember(Name="role")
    // @ApiMember(Description="The role of the author of this message.")
    public role: string;

    public constructor(init?: Partial<ChoiceMessage>) { (Object as any).assign(this, init); }
}

export class Choice
{
    /** @description The reason the model stopped generating tokens. This will be stop if the model hit a natural stop point or a provided stop sequence, length if the maximum number of tokens specified in the request was reached, content_filter if content was omitted due to a flag from our content filters, tool_calls if the model called a tool */
    // @DataMember(Name="finish_reason")
    // @ApiMember(Description="The reason the model stopped generating tokens. This will be stop if the model hit a natural stop point or a provided stop sequence, length if the maximum number of tokens specified in the request was reached, content_filter if content was omitted due to a flag from our content filters, tool_calls if the model called a tool")
    public finish_reason: string;

    /** @description The index of the choice in the list of choices. */
    // @DataMember(Name="index")
    // @ApiMember(Description="The index of the choice in the list of choices.")
    public index: number;

    /** @description A chat completion message generated by the model. */
    // @DataMember(Name="message")
    // @ApiMember(Description="A chat completion message generated by the model.")
    public message: ChoiceMessage;

    public constructor(init?: Partial<Choice>) { (Object as any).assign(this, init); }
}

/** @description Usage statistics for the completion request. */
// @Api(Description="Usage statistics for the completion request.")
// @DataContract
export class OpenAiCompletionUsage
{
    /** @description When using Predicted Outputs, the number of tokens in the prediction that appeared in the completion. */
    // @DataMember(Name="accepted_prediction_tokens")
    // @ApiMember(Description="When using Predicted Outputs, the number of tokens in the prediction that appeared in the completion.\n\n")
    public accepted_prediction_tokens: number;

    /** @description Audio input tokens generated by the model. */
    // @DataMember(Name="audio_tokens")
    // @ApiMember(Description="Audio input tokens generated by the model.")
    public audio_tokens: number;

    /** @description Tokens generated by the model for reasoning. */
    // @DataMember(Name="reasoning_tokens")
    // @ApiMember(Description="Tokens generated by the model for reasoning.")
    public reasoning_tokens: number;

    /** @description When using Predicted Outputs, the number of tokens in the prediction that did not appear in the completion. */
    // @DataMember(Name="rejected_prediction_tokens")
    // @ApiMember(Description="When using Predicted Outputs, the number of tokens in the prediction that did not appear in the completion.")
    public rejected_prediction_tokens: number;

    public constructor(init?: Partial<OpenAiCompletionUsage>) { (Object as any).assign(this, init); }
}

/** @description Breakdown of tokens used in the prompt. */
// @Api(Description="Breakdown of tokens used in the prompt.")
// @DataContract
export class OpenAiPromptUsage
{
    /** @description When using Predicted Outputs, the number of tokens in the prediction that appeared in the completion. */
    // @DataMember(Name="accepted_prediction_tokens")
    // @ApiMember(Description="When using Predicted Outputs, the number of tokens in the prediction that appeared in the completion.\n\n")
    public accepted_prediction_tokens: number;

    /** @description Audio input tokens present in the prompt. */
    // @DataMember(Name="audio_tokens")
    // @ApiMember(Description="Audio input tokens present in the prompt.")
    public audio_tokens: number;

    /** @description Cached tokens present in the prompt. */
    // @DataMember(Name="cached_tokens")
    // @ApiMember(Description="Cached tokens present in the prompt.")
    public cached_tokens: number;

    public constructor(init?: Partial<OpenAiPromptUsage>) { (Object as any).assign(this, init); }
}

/** @description Usage statistics for the completion request. */
// @Api(Description="Usage statistics for the completion request.")
// @DataContract
export class OpenAiUsage
{
    /** @description Number of tokens in the generated completion. */
    // @DataMember(Name="completion_tokens")
    // @ApiMember(Description="Number of tokens in the generated completion.")
    public completion_tokens: number;

    /** @description Number of tokens in the prompt. */
    // @DataMember(Name="prompt_tokens")
    // @ApiMember(Description="Number of tokens in the prompt.")
    public prompt_tokens: number;

    /** @description Total number of tokens used in the request (prompt + completion). */
    // @DataMember(Name="total_tokens")
    // @ApiMember(Description="Total number of tokens used in the request (prompt + completion).")
    public total_tokens: number;

    /** @description Breakdown of tokens used in a completion. */
    // @DataMember(Name="completion_tokens_details")
    // @ApiMember(Description="Breakdown of tokens used in a completion.")
    public completion_tokens_details?: OpenAiCompletionUsage;

    /** @description Breakdown of tokens used in the prompt. */
    // @DataMember(Name="prompt_tokens_details")
    // @ApiMember(Description="Breakdown of tokens used in the prompt.")
    public prompt_tokens_details?: OpenAiPromptUsage;

    public constructor(init?: Partial<OpenAiUsage>) { (Object as any).assign(this, init); }
}

// @DataContract
export class OpenAiChatResponse
{
    /** @description A unique identifier for the chat completion. */
    // @DataMember(Name="id")
    // @ApiMember(Description="A unique identifier for the chat completion.")
    public id: string;

    /** @description A list of chat completion choices. Can be more than one if n is greater than 1. */
    // @DataMember(Name="choices")
    // @ApiMember(Description="A list of chat completion choices. Can be more than one if n is greater than 1.")
    public choices: Choice[] = [];

    /** @description The Unix timestamp (in seconds) of when the chat completion was created. */
    // @DataMember(Name="created")
    // @ApiMember(Description="The Unix timestamp (in seconds) of when the chat completion was created.")
    public created: number;

    /** @description The model used for the chat completion. */
    // @DataMember(Name="model")
    // @ApiMember(Description="The model used for the chat completion.")
    public model: string;

    /** @description This fingerprint represents the backend configuration that the model runs with. */
    // @DataMember(Name="system_fingerprint")
    // @ApiMember(Description="This fingerprint represents the backend configuration that the model runs with.")
    public system_fingerprint?: string;

    /** @description The object type, which is always chat.completion. */
    // @DataMember(Name="object")
    // @ApiMember(Description="The object type, which is always chat.completion.")
    public object: string;

    /** @description Specifies the processing type used for serving the request. */
    // @DataMember(Name="service_tier")
    // @ApiMember(Description="Specifies the processing type used for serving the request.")
    public service_tier?: string;

    /** @description Usage statistics for the completion request. */
    // @DataMember(Name="usage")
    // @ApiMember(Description="Usage statistics for the completion request.")
    public usage: OpenAiUsage;

    /** @description Set of 16 key-value pairs that can be attached to an object. This can be useful for storing additional information about the object in a structured format. */
    // @DataMember(Name="metadata")
    // @ApiMember(Description="Set of 16 key-value pairs that can be attached to an object. This can be useful for storing additional information about the object in a structured format.")
    public metadata?: { [index:string]: string; };

    // @DataMember(Name="responseStatus")
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<OpenAiChatResponse>) { (Object as any).assign(this, init); }
}

export class UserPrefs
{
    public lastReadNotificationId: number;
    public lastReadAchievementId: number;

    public constructor(init?: Partial<UserPrefs>) { (Object as any).assign(this, init); }
}

export enum QuotaTier
{
    Free = 'Free',
    Contributor = 'Contributor',
    Plus = 'Plus',
    Pro = 'Pro',
    Moderator = 'Moderator',
}

export class User
{
    public id: string;
    public userName: string;
    public ratings: Rating[] = [];
    public profileUrl?: string;
    public prefs: UserPrefs;
    public karma: number;
    public credits: number;
    public quotaTier: QuotaTier;
    public lastBonusDate?: string;
    public modifiedDate: string;

    public constructor(init?: Partial<User>) { (Object as any).assign(this, init); }
}

export class QueryDb_2<From, Into> extends QueryBase
{

    public constructor(init?: Partial<QueryDb_2<From, Into>>) { super(init); (Object as any).assign(this, init); }
}

export class ArtifactReactionInfo
{
    public id: number;
    public artifactId: number;
    public reaction: Reaction;

    public constructor(init?: Partial<ArtifactReactionInfo>) { (Object as any).assign(this, init); }
}

// @Flags()
export enum AchievementType
{
    Unknown = 0,
    PublishedGeneration = 1,
    ArtifactReaction = 2,
    CommentReaction = 3,
    GenerationComment = 4,
    AddedToCollection = 5,
}

export class Achievement
{
    public id: number;
    public userId: string;
    public type: AchievementType;
    public title?: string;
    public generationId?: string;
    public artifactId?: number;
    public refId?: string;
    public refUserId?: string;
    public score: number;
    public createdDate: string;

    public constructor(init?: Partial<Achievement>) { (Object as any).assign(this, init); }
}

export class AchievementInfo
{
    public id: number;
    public type: AchievementType;
    public generationId?: string;
    public artifactId?: number;
    public refId?: string;
    public score: number;
    public created: number;

    public constructor(init?: Partial<AchievementInfo>) { (Object as any).assign(this, init); }
}

export enum RoomType
{
    Single = 'Single',
    Double = 'Double',
    Queen = 'Queen',
    Twin = 'Twin',
    Suite = 'Suite',
}

/** @description Discount Coupons */
export class Coupon
{
    public id: string;
    public description: string;
    public discount: number;
    public expiryDate: string;

    public constructor(init?: Partial<Coupon>) { (Object as any).assign(this, init); }
}

/** @description Booking Details */
export class Booking extends AuditBase
{
    public id: number;
    public name: string;
    public roomType: RoomType;
    public roomNumber: number;
    public bookingStartDate: string;
    public bookingEndDate?: string;
    public cost: number;
    // @References("typeof(MyApp.ServiceModel.Coupon)")
    public couponId?: string;

    public discount: Coupon;
    public notes?: string;
    public cancelled?: boolean;
    public employee: User;

    public constructor(init?: Partial<Booking>) { super(init); (Object as any).assign(this, init); }
}

export enum ComfyWorkflowType
{
    TextToImage = 'TextToImage',
    ImageToImage = 'ImageToImage',
    ImageToText = 'ImageToText',
    TextToAudio = 'TextToAudio',
    TextToVideo = 'TextToVideo',
    TextTo3D = 'TextTo3D',
    AudioToText = 'AudioToText',
    AudioToAudio = 'AudioToAudio',
    VideoToText = 'VideoToText',
    ImageToVideo = 'ImageToVideo',
}

export enum ComfyPrimarySource
{
    Text = 'Text',
    Image = 'Image',
    Video = 'Video',
    Audio = 'Audio',
}

export enum ComfyInputType
{
    Unknown = 'Unknown',
    Audio = 'Audio',
    Boolean = 'Boolean',
    Clip = 'Clip',
    ClipVision = 'ClipVision',
    ClipVisionOutput = 'ClipVisionOutput',
    Combo = 'Combo',
    Conditioning = 'Conditioning',
    ControlNet = 'ControlNet',
    Enum = 'Enum',
    FasterWhisperModel = 'FasterWhisperModel',
    Filepath = 'Filepath',
    Fl2Model = 'Fl2Model',
    Float = 'Float',
    Floats = 'Floats',
    Gligen = 'Gligen',
    Guider = 'Guider',
    Hooks = 'Hooks',
    Image = 'Image',
    Int = 'Int',
    Latent = 'Latent',
    LatentOperation = 'LatentOperation',
    Load3D = 'Load3D',
    Load3DAnimation = 'Load3DAnimation',
    Mask = 'Mask',
    Mesh = 'Mesh',
    Model = 'Model',
    Noise = 'Noise',
    Photomaker = 'Photomaker',
    Sampler = 'Sampler',
    Sigmas = 'Sigmas',
    String = 'String',
    StyleModel = 'StyleModel',
    Subtitle = 'Subtitle',
    TranscriptionPipeline = 'TranscriptionPipeline',
    Transcriptions = 'Transcriptions',
    UpscaleModel = 'UpscaleModel',
    VAE = 'VAE',
    VHSAudio = 'VHSAudio',
    Voxel = 'Voxel',
    WavBytes = 'WavBytes',
    WavBytesBatch = 'WavBytesBatch',
    Webcam = 'Webcam',
    Video = 'Video',
}

export class ComfyInputDefinition
{
    public classType: string;
    public nodeId: number;
    public valueIndex: number;
    public name: string;
    public label: string;
    public type: ComfyInputType;
    public tooltip?: string;
    public default?: Object;
    public min?: number;
    public max?: number;
    public step?: number;
    public round?: number;
    public multiline?: boolean;
    public dynamicPrompts?: boolean;
    public controlAfterGenerate?: boolean;
    public upload?: boolean;
    public enumValues?: string[];
    public comboValues?: { [index:string]: Object; };
    public placeholder?: string;

    public constructor(init?: Partial<ComfyInputDefinition>) { (Object as any).assign(this, init); }
}

export class AssetInfo
{
    public asset: string;
    public url: string;

    public constructor(init?: Partial<AssetInfo>) { (Object as any).assign(this, init); }
}

export class WorkflowInfo
{
    // @References("typeof(MyApp.ServiceModel.WorkflowVersion)")
    public id: number;

    // @References("typeof(MyApp.ServiceModel.Workflow)")
    public parentId: number;

    public name: string;
    public type: ComfyWorkflowType;
    public input: ComfyPrimarySource;
    public output: ComfyPrimarySource;
    public inputs: ComfyInputDefinition[] = [];
    public assets: AssetInfo[] = [];
    public customNodes: string[] = [];
    public pipPackages: string[] = [];

    public constructor(init?: Partial<WorkflowInfo>) { (Object as any).assign(this, init); }
}

export class WorkflowVersion extends AuditBase
{
    public id: number;
    public parentId: number;
    public name: string;
    public version: string;
    public path: string;
    public workflow: { [index:string]: Object; } = {};
    public info: WorkflowInfo;
    public nodes: string[] = [];
    public assets: string[] = [];
    public posterImage: string;
    public reactions: { [index:string]: number; } = {};
    public reactionsCount: number;

    public constructor(init?: Partial<WorkflowVersion>) { super(init); (Object as any).assign(this, init); }
}

export class WorkflowVersionReactionInfo
{
    public id: number;
    public versionId: number;
    public reaction: Reaction;

    public constructor(init?: Partial<WorkflowVersionReactionInfo>) { (Object as any).assign(this, init); }
}

export enum CreditReason
{
    SignupBonus = 'SignupBonus',
    GenerationDebit = 'GenerationDebit',
    GenerationCredit = 'GenerationCredit',
    DailyBonus = 'DailyBonus',
}

export class CreditLog
{
    public id: number;
    public userId: string;
    public credits: number;
    public reason?: CreditReason;
    public description?: string;
    public refId?: string;
    public refUserId?: string;
    public createdDate: string;

    public constructor(init?: Partial<CreditLog>) { (Object as any).assign(this, init); }
}

export class Asset
{
    public id: number;
    public name: string;
    public type?: string;
    public base?: string;
    public savePath: string;
    public fileName: string;
    public description?: string;
    public reference?: string;
    public url: string;
    public token?: string;
    public size: string;
    public length: number;
    public hash?: string;
    public lastChecked?: string;
    public modifiedDate?: string;
    public modifiedBy?: string;

    public constructor(init?: Partial<Asset>) { (Object as any).assign(this, init); }
}

export class CommentResult
{
    public id: number;
    public threadId: number;
    public replyId?: number;
    public content: string;
    public upVotes: number;
    public downVotes: number;
    public votes: number;
    public flagReason?: string;
    public notes?: string;
    public userName: string;
    public handle?: string;
    public profileUrl?: string;
    public avatar?: string;
    public createdDate: string;
    public modifiedDate: string;

    public constructor(init?: Partial<CommentResult>) { (Object as any).assign(this, init); }
}

export class WorkflowVersionReaction
{
    public id: number;
    public versionId: number;
    public userId: string;
    public reaction: Reaction;
    public createdDate: string;

    public constructor(init?: Partial<WorkflowVersionReaction>) { (Object as any).assign(this, init); }
}

export class ThreadReaction
{
    public id: number;
    public threadId: number;
    public reaction: Reaction;
    public userId: string;
    public createdDate: string;

    public constructor(init?: Partial<ThreadReaction>) { (Object as any).assign(this, init); }
}

export class GenerationRef
{
    public id: string;
    public positivePrompt?: string;
    public artifactUrls: string[] = [];
    public artifactPaths: string[] = [];
    public publicThreadId?: number;

    public constructor(init?: Partial<GenerationRef>) { (Object as any).assign(this, init); }
}

export class AgentEvent
{
    public name: string;
    public args?: { [index:string]: string; };

    public constructor(init?: Partial<AgentEvent>) { (Object as any).assign(this, init); }
}

export class ComfyAgentSettings
{
    public inDevicePool: boolean;
    public preserveOutputs: boolean;

    public constructor(init?: Partial<ComfyAgentSettings>) { (Object as any).assign(this, init); }
}

export class ArtifactRef
{
    public id: number;
    public type: AssetType;
    public url: string;
    public length: number;
    public deviceId?: string;

    public constructor(init?: Partial<ArtifactRef>) { (Object as any).assign(this, init); }
}

// @DataContract
export class QueryResponse<T>
{
    // @DataMember(Order=1)
    public offset: number;

    // @DataMember(Order=2)
    public total: number;

    // @DataMember(Order=3)
    public results: T[] = [];

    // @DataMember(Order=4)
    public meta?: { [index:string]: string; };

    // @DataMember(Order=5)
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<QueryResponse<T>>) { (Object as any).assign(this, init); }
}

export class CategoryStat
{
    public id: number;
    public name: string;
    public count: number;

    public constructor(init?: Partial<CategoryStat>) { (Object as any).assign(this, init); }
}

export class AudioInfo
{
    public codec?: string;
    public duration?: number;
    public length?: number;
    public bitrate?: number;
    public streams?: number;
    public programs?: number;

    public constructor(init?: Partial<AudioInfo>) { (Object as any).assign(this, init); }
}

export interface IAssetMetadata
{
    ratings?: Ratings;
    tags?: { [index:string]: number; };
    categories?: { [index:string]: number; };
    objects?: ObjectDetection[];
}

export class AgentInfo
{
    public id: number;
    public shortId: string;
    public userId: string;
    public gpus?: GpuInfo[];
    public nodes: string[] = [];
    public models: { [index:string]: string[]; } = {};
    public languageModels?: string[];
    public requirePip?: string[];
    public requireNodes?: string[];
    public requireModels?: string[];
    public installedPip?: string[];
    public installedNodes?: string[];
    public installedModels?: string[];
    public hiddenModels?: string[];
    public enabled: boolean;
    public offlineDate?: string;
    public createdDate: string;
    public modifiedDate: string;
    public lastUpdate: string;
    public queueCount: number;
    public devicePool?: string;

    public constructor(init?: Partial<AgentInfo>) { (Object as any).assign(this, init); }
}

export class ComfyTask
{
    public id: number;
    public name: string;

    public constructor(init?: Partial<ComfyTask>) { (Object as any).assign(this, init); }
}

// @DataContract
export class ApiNode
{
    // @DataMember(Name="inputs")
    public inputs: { [index:string]: Object; } = {};

    // @DataMember(Name="class_type")
    public class_type: string;

    public constructor(init?: Partial<ApiNode>) { (Object as any).assign(this, init); }
}

export class StatTotal
{
    public name: string;
    public count: number;
    public credits: number;

    public constructor(init?: Partial<StatTotal>) { (Object as any).assign(this, init); }
}

export class PageStats
{
    public label: string;
    public total: number;

    public constructor(init?: Partial<PageStats>) { (Object as any).assign(this, init); }
}

// @Flags()
export enum Table
{
    Artifact = 1,
    ArtifactTag = 2,
    ArtifactCategory = 3,
    ArtifactReaction = 4,
    HiddenArtifact = 5,
    Thread = 6,
    Comment = 7,
    Workflow = 8,
    WorkflowGeneration = 9,
    WorkflowVersion = 10,
    Achievement = 11,
}

export class DeletedRow
{
    public id: number;
    public table: Table;
    public key: string;

    public constructor(init?: Partial<DeletedRow>) { (Object as any).assign(this, init); }
}

export class MyAchievement
{
    public id: number;
    public type: AchievementType;
    public title?: string;
    public generationId?: string;
    public artifactId?: number;
    public refId?: string;
    public refUserName?: string;
    public score: number;
    public created: number;

    public constructor(init?: Partial<MyAchievement>) { (Object as any).assign(this, init); }
}

// @Flags()
export enum NotificationType
{
    Unknown = 0,
    NewComment = 1,
    CommentMention = 2,
    NewBadge = 3,
}

export class MyNotification
{
    public id: number;
    public type: NotificationType;
    public generationId?: string;
    public artifactId?: number;
    public refId: string;
    public summary: string;
    public created: number;
    public href?: string;
    public title?: string;
    public refUserName?: string;

    public constructor(init?: Partial<MyNotification>) { (Object as any).assign(this, init); }
}

export class MyCreditLog
{
    public credits: number;
    public reason?: CreditReason;
    public description?: string;
    public refId?: string;
    public refUserName?: string;
    public created: number;

    public constructor(init?: Partial<MyCreditLog>) { (Object as any).assign(this, init); }
}

/** @description A list of messages comprising the conversation so far. */
// @Api(Description="A list of messages comprising the conversation so far.")
// @DataContract
export class OpenAiMessage
{
    /** @description The contents of the message. */
    // @DataMember(Name="content")
    // @ApiMember(Description="The contents of the message.")
    public content: Object;

    /** @description The images for the message. */
    // @DataMember(Name="images")
    // @ApiMember(Description="The images for the message.")
    public images: string[] = [];

    /** @description The role of the author of this message. Valid values are `system`, `user`, `assistant` and `tool`. */
    // @DataMember(Name="role")
    // @ApiMember(Description="The role of the author of this message. Valid values are `system`, `user`, `assistant` and `tool`.")
    public role: string;

    /** @description An optional name for the participant. Provides the model information to differentiate between participants of the same role. */
    // @DataMember(Name="name")
    // @ApiMember(Description="An optional name for the participant. Provides the model information to differentiate between participants of the same role.")
    public name?: string;

    /** @description The tool calls generated by the model, such as function calls. */
    // @DataMember(Name="tool_calls")
    // @ApiMember(Description="The tool calls generated by the model, such as function calls.")
    public tool_calls?: ToolCall[];

    /** @description Tool call that this message is responding to. */
    // @DataMember(Name="tool_call_id")
    // @ApiMember(Description="Tool call that this message is responding to.")
    public tool_call_id?: string;

    public constructor(init?: Partial<OpenAiMessage>) { (Object as any).assign(this, init); }
}

/** @description Parameters for audio output. Required when audio output is requested with modalities: [audio] */
// @Api(Description="Parameters for audio output. Required when audio output is requested with modalities: [audio]")
// @DataContract
export class OpenAiChatAudio
{
    /** @description Specifies the output audio format. Must be one of wav, mp3, flac, opus, or pcm16. */
    // @DataMember(Name="format")
    // @ApiMember(Description="Specifies the output audio format. Must be one of wav, mp3, flac, opus, or pcm16.")
    public format: string;

    /** @description The voice the model uses to respond. Supported voices are alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, and shimmer. */
    // @DataMember(Name="voice")
    // @ApiMember(Description="The voice the model uses to respond. Supported voices are alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, and shimmer.")
    public voice: string;

    public constructor(init?: Partial<OpenAiChatAudio>) { (Object as any).assign(this, init); }
}

export enum ResponseFormat
{
    Text = 'text',
    JsonObject = 'json_object',
}

// @DataContract
export class OpenAiResponseFormat
{
    /** @description An object specifying the format that the model must output. Compatible with GPT-4 Turbo and all GPT-3.5 Turbo models newer than gpt-3.5-turbo-1106. */
    // @DataMember(Name="response_format")
    // @ApiMember(Description="An object specifying the format that the model must output. Compatible with GPT-4 Turbo and all GPT-3.5 Turbo models newer than gpt-3.5-turbo-1106.")
    public response_format: ResponseFormat;

    public constructor(init?: Partial<OpenAiResponseFormat>) { (Object as any).assign(this, init); }
}

export enum OpenAiToolType
{
    Function = 'function',
}

// @DataContract
export class OpenAiTools
{
    /** @description The type of the tool. Currently, only function is supported. */
    // @DataMember(Name="type")
    // @ApiMember(Description="The type of the tool. Currently, only function is supported.")
    public type: OpenAiToolType;

    public constructor(init?: Partial<OpenAiTools>) { (Object as any).assign(this, init); }
}

export class GetPendingArtifactTasksResponse
{
    public missingArtifacts: number[] = [];
    public existingCaptionArtifacts: number[] = [];
    public existingDescribeArtifacts: number[] = [];
    public requeueCaptionArtifacts: number[] = [];
    public requeueDescribeArtifacts: number[] = [];
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<GetPendingArtifactTasksResponse>) { (Object as any).assign(this, init); }
}

// @DataContract
export class StringsResponse
{
    // @DataMember(Order=1)
    public results: string[] = [];

    // @DataMember(Order=2)
    public meta?: { [index:string]: string; };

    // @DataMember(Order=3)
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<StringsResponse>) { (Object as any).assign(this, init); }
}

// @DataContract
export class StringResponse
{
    // @DataMember(Order=1)
    public result: string;

    // @DataMember(Order=2)
    public meta?: { [index:string]: string; };

    // @DataMember(Order=3)
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<StringResponse>) { (Object as any).assign(this, init); }
}

export class HardDeleteGenerationsResponse
{
    public effect: string;
    public results: GenerationRef[] = [];
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<HardDeleteGenerationsResponse>) { (Object as any).assign(this, init); }
}

export class Artifact extends AuditBase implements IAssetMetadata
{
    public id: number;
    public generationId: string;
    public type: AssetType;
    public url: string;
    public length: number;
    public width?: number;
    public height?: number;
    public resolution?: number;
    public versionId?: number;
    public workflowId?: number;
    public threadId?: number;
    public credits?: number;
    public rating?: Rating;
    public ratings?: Ratings;
    public tags?: { [index:string]: number; };
    public categories?: { [index:string]: number; };
    public reactions: { [index:string]: number; } = {};
    public reactionsCount: number;
    public phash?: string;
    public color?: string;
    public caption?: string;
    public description?: string;
    public audio?: AudioInfo;
    public publishedBy?: string;
    public publishedDate?: string;
    public variantId?: number;
    public variantName?: string;
    public deviceId?: string;
    public error?: ResponseStatus;
    // @Ignore()
    public userName?: string;

    // @Ignore()
    public userKarma?: number;

    public constructor(init?: Partial<Artifact>) { super(init); (Object as any).assign(this, init); }
}

export class DeleteDuplicateArtifactsResponse
{
    public urlCounts: { [index:string]: number; } = {};
    public deletedArtifacts: Artifact[] = [];
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<DeleteDuplicateArtifactsResponse>) { (Object as any).assign(this, init); }
}

export class CleanResponse
{
    public summary: { [index:string]: number; } = {};
    public emptyGenerations: string[] = [];
    public missingGenerationFiles: string[] = [];
    public missingDbArtifacts: string[] = [];
    public multipleDbArtifacts: { [index:string]: number[]; } = {};
    public errors: string[] = [];
    public actions: string[] = [];
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<CleanResponse>) { (Object as any).assign(this, init); }
}

export class CreateMissingArtifactTagsResponse
{
    public tagsCreated: number;
    public artifactTagsCreated: number;
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<CreateMissingArtifactTagsResponse>) { (Object as any).assign(this, init); }
}

export class CreateMissingArtifactCategoriesResponse
{
    public categoriesCreated: number;
    public artifactCategoriesCreated: number;
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<CreateMissingArtifactCategoriesResponse>) { (Object as any).assign(this, init); }
}

export class GetAiChatResponse
{
    public result: string;
    public response?: OpenAiChatResponse;
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<GetAiChatResponse>) { (Object as any).assign(this, init); }
}

// @DataContract
export class EmptyResponse
{
    // @DataMember(Order=1)
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<EmptyResponse>) { (Object as any).assign(this, init); }
}

export class GetComfyAgentEventsResponse
{
    public results: AgentEvent[] = [];
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<GetComfyAgentEventsResponse>) { (Object as any).assign(this, init); }
}

export class RegisterComfyAgentResponse
{
    public id: number;
    public apiKey: string;
    public deviceId: string;
    public nodes: string[] = [];
    public categories: string[] = [];
    public requirePip?: string[];
    public requireNodes?: string[];
    public requireModels?: string[];
    public settings: ComfyAgentSettings;
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<RegisterComfyAgentResponse>) { (Object as any).assign(this, init); }
}

export class AgentDataResponse
{
    public categories: string[] = [];
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<AgentDataResponse>) { (Object as any).assign(this, init); }
}

export class GetPopularCategoriesResponse
{
    public results: CategoryStat[] = [];
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<GetPopularCategoriesResponse>) { (Object as any).assign(this, init); }
}

// @DataContract
export class IdResponse
{
    // @DataMember(Order=1)
    public id: string;

    // @DataMember(Order=2)
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<IdResponse>) { (Object as any).assign(this, init); }
}

export class GetAppDataResponse
{
    public assetCount: number;
    public workflowCount: number;
    public agentEventCounts: { [index:string]: number; } = {};
    public agents: AgentInfo[] = [];
    public defaultGatewayNodes: string[] = [];
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<GetAppDataResponse>) { (Object as any).assign(this, init); }
}

export class OwnerAgentInfo extends AgentInfo
{
    public deviceId: string;
    public userId: string;
    public userName?: string;
    public lastIp?: string;
    public status?: string;
    public modelSettings?: { [index:string]: ModelSettings; };
    public settings: ComfyAgentSettings;

    public constructor(init?: Partial<OwnerAgentInfo>) { super(init); (Object as any).assign(this, init); }
}

export class UpdateComfyAgentSettingsResponse
{
    public result: OwnerAgentInfo;
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<UpdateComfyAgentSettingsResponse>) { (Object as any).assign(this, init); }
}

export class ComfyTasksResponse
{
    public results: ComfyTask[] = [];
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<ComfyTasksResponse>) { (Object as any).assign(this, init); }
}

export class GetWorkflowVersionResponse
{
    public result: WorkflowVersion;
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<GetWorkflowVersionResponse>) { (Object as any).assign(this, init); }
}

export class GetWorkflowInfoResponse
{
    public result: WorkflowInfo;
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<GetWorkflowInfoResponse>) { (Object as any).assign(this, init); }
}

export class RequeueGenerationResponse
{
    public id: string;
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<RequeueGenerationResponse>) { (Object as any).assign(this, init); }
}

export class QueueWorkflowResponse
{
    public id: string;
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<QueueWorkflowResponse>) { (Object as any).assign(this, init); }
}

// @DataContract
export class ApiPrompt
{
    // @DataMember(Name="prompt")
    public prompt: { [index:string]: ApiNode; } = {};

    // @DataMember(Name="extra_data")
    public extra_data?: { [index:string]: Object; };

    // @DataMember(Name="client_id")
    public client_id?: string;

    public constructor(init?: Partial<ApiPrompt>) { (Object as any).assign(this, init); }
}

export class GetExecutedWorkflowResultsResponse
{
    public result: WorkflowResult;
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<GetExecutedWorkflowResultsResponse>) { (Object as any).assign(this, init); }
}

export class GetExecutedWorkflowsResultsResponse
{
    public results?: { [index:string]: WorkflowResult; };
    public errors?: { [index:string]: ResponseStatus; };
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<GetExecutedWorkflowsResultsResponse>) { (Object as any).assign(this, init); }
}

export class GetWorkflowGenerationResponse
{
    public result: WorkflowGeneration;
    public artifacts: Artifact[] = [];
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<GetWorkflowGenerationResponse>) { (Object as any).assign(this, init); }
}

export class UpdateWorkflowVersionResponse
{
    public versionId: number;
    public updated: number;
    public nodes: string[] = [];
    public assets: string[] = [];
    public info: WorkflowInfo;
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<UpdateWorkflowVersionResponse>) { (Object as any).assign(this, init); }
}

export class ParsedWorkflow
{
    public baseModel: string;
    public version: string;
    public name: string;
    public category: string;
    public path: string;
    public nodes: string[] = [];
    public assets: string[] = [];
    public requiresAssets: string[] = [];
    public requiresCustomNodes: string[] = [];
    public requiresPipPackages: string[] = [];
    public info: WorkflowInfo;
    public workflow: { [index:string]: Object; } = {};
    public apiPrompt?: { [index:string]: ApiNode; };

    public constructor(init?: Partial<ParsedWorkflow>) { (Object as any).assign(this, init); }
}

export class UploadNewWorkflowResponse
{
    public versionId: number;
    public nodes: string[] = [];
    public assets: string[] = [];
    public info: WorkflowInfo;
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<UploadNewWorkflowResponse>) { (Object as any).assign(this, init); }
}

export class FindAssetsResponse
{
    public results: { [index:string]: string; } = {};
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<FindAssetsResponse>) { (Object as any).assign(this, init); }
}

export class FindCustomNodesResponse
{
    public results: { [index:string]: string; } = {};
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<FindCustomNodesResponse>) { (Object as any).assign(this, init); }
}

export class GetDeviceStatusResponse
{
    public deviceId: string;
    public modifiedDate: string;
    public requirePip?: string[];
    public requireNodes?: string[];
    public requireModels?: string[];
    public installedPip?: string[];
    public installedNodes?: string[];
    public installedModels?: string[];
    public nodes: string[] = [];
    public models: { [index:string]: string[]; } = {};
    public languageModels?: string[];
    public status?: string;
    public logs?: string;
    public error?: ResponseStatus;
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<GetDeviceStatusResponse>) { (Object as any).assign(this, init); }
}

export class DeleteFilesResponse
{
    public deleted: string[] = [];
    public missing: string[] = [];
    public failed: string[] = [];
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<DeleteFilesResponse>) { (Object as any).assign(this, init); }
}

export class HelloResponse
{
    public result: string;

    public constructor(init?: Partial<HelloResponse>) { (Object as any).assign(this, init); }
}

export class AdminDataResponse
{
    public pageStats: PageStats[] = [];

    public constructor(init?: Partial<AdminDataResponse>) { (Object as any).assign(this, init); }
}

export class GetTagArtifactIdsResponse
{
    public total: number;
    public results: number[] = [];
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<GetTagArtifactIdsResponse>) { (Object as any).assign(this, init); }
}

export class GetCategoryArtifactIdsResponse
{
    public total: number;
    public results: number[] = [];
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<GetCategoryArtifactIdsResponse>) { (Object as any).assign(this, init); }
}

export class TestUpload implements IReturn<TestUpload>, IPost
{
    public int: number;
    public nullableId?: number;
    public long: number;
    public double: number;
    public string: string;
    public dateTime: string;
    public intArray: number[] = [];
    public intList: number[] = [];
    public stringArray: string[] = [];
    public stringList: string[] = [];
    public pocoArray: Poco[] = [];
    public pocoList: Poco[] = [];
    public nullableByteArray: number[] = [];
    public nullableByteList: number[] = [];
    public nullableDateTimeArray: string[] = [];
    public nullableDateTimeList: string[] = [];
    public pocoLookup: { [index:string]: Poco[]; } = {};
    public pocoLookupMap: { [index:string]: { [index:string]: Poco; }[]; } = {};
    public mapList?: { [index:string]: string[]; };

    public constructor(init?: Partial<TestUpload>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'TestUpload'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new TestUpload(); }
}

export class GetThreadResponse
{
    public result: Thread;
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<GetThreadResponse>) { (Object as any).assign(this, init); }
}

export class GetDeletedRowsResponse
{
    public lastId: number;
    public results: DeletedRow[] = [];
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<GetDeletedRowsResponse>) { (Object as any).assign(this, init); }
}

export class UserInfo
{
    public karma: number;
    public credits: number;
    public quotaTier: QuotaTier;
    public lastReadNotificationId: number;
    public lastReadAchievementId: number;
    public modified: number;
    public lastBonusDate?: string;
    public claimBonusMessage?: string;
    public timeTillNextBonus: string;
    public latestAchievements: MyAchievement[] = [];
    public latestNotifications: MyNotification[] = [];
    public latestCredits: MyCreditLog[] = [];
    public hasUnreadAchievements: boolean;
    public hasUnreadNotifications: boolean;

    public constructor(init?: Partial<UserInfo>) { (Object as any).assign(this, init); }
}

export class ClaimBonusCreditsResponse
{
    public creditsAwarded: number;
    public message?: string;
    public responseStatus?: ResponseStatus;

    public constructor(init?: Partial<ClaimBonusCreditsResponse>) { (Object as any).assign(this, init); }
}

/** @description Given a list of messages comprising a conversation, the model will return a response. */
// @Api(Description="Given a list of messages comprising a conversation, the model will return a response.")
// @DataContract
export class ChatCompletion
{
    /** @description A list of messages comprising the conversation so far. */
    // @DataMember(Name="messages")
    // @ApiMember(Description="A list of messages comprising the conversation so far.")
    public messages: OpenAiMessage[] = [];

    /** @description ID of the model to use. See the model endpoint compatibility table for details on which models work with the Chat API */
    // @DataMember(Name="model")
    // @ApiMember(Description="ID of the model to use. See the model endpoint compatibility table for details on which models work with the Chat API")
    public model: string;

    /** @description Parameters for audio output. Required when audio output is requested with modalities: [audio] */
    // @DataMember(Name="audio")
    // @ApiMember(Description="Parameters for audio output. Required when audio output is requested with modalities: [audio]")
    public audio?: OpenAiChatAudio;

    /** @description Number between `-2.0` and `2.0`. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim. */
    // @DataMember(Name="frequency_penalty")
    // @ApiMember(Description="Number between `-2.0` and `2.0`. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.")
    public frequency_penalty?: number;

    /** @description Modify the likelihood of specified tokens appearing in the completion. */
    // @DataMember(Name="logit_bias")
    // @ApiMember(Description="Modify the likelihood of specified tokens appearing in the completion.")
    public logit_bias?: { [index:number]: number; };

    /** @description Whether to return log probabilities of the output tokens or not. If true, returns the log probabilities of each output token returned in the content of message. */
    // @DataMember(Name="logprobs")
    // @ApiMember(Description="Whether to return log probabilities of the output tokens or not. If true, returns the log probabilities of each output token returned in the content of message.")
    public logprobs?: boolean;

    /** @description An upper bound for the number of tokens that can be generated for a completion, including visible output tokens and reasoning tokens. */
    // @DataMember(Name="max_completion_tokens")
    // @ApiMember(Description="An upper bound for the number of tokens that can be generated for a completion, including visible output tokens and reasoning tokens.")
    public max_completion_tokens?: number;

    /** @description Set of 16 key-value pairs that can be attached to an object. This can be useful for storing additional information about the object in a structured format. */
    // @DataMember(Name="metadata")
    // @ApiMember(Description="Set of 16 key-value pairs that can be attached to an object. This can be useful for storing additional information about the object in a structured format.")
    public metadata?: { [index:string]: string; };

    /** @description Output types that you would like the model to generate. Most models are capable of generating text, which is the default: */
    // @DataMember(Name="modalities")
    // @ApiMember(Description="Output types that you would like the model to generate. Most models are capable of generating text, which is the default:")
    public modalities?: string[];

    /** @description How many chat completion choices to generate for each input message. Note that you will be charged based on the number of generated tokens across all of the choices. Keep `n` as `1` to minimize costs. */
    // @DataMember(Name="n")
    // @ApiMember(Description="How many chat completion choices to generate for each input message. Note that you will be charged based on the number of generated tokens across all of the choices. Keep `n` as `1` to minimize costs.")
    public n?: number;

    /** @description Whether to enable parallel function calling during tool use. */
    // @DataMember(Name="parallel_tool_calls")
    // @ApiMember(Description="Whether to enable parallel function calling during tool use.")
    public parallel_tool_calls?: boolean;

    /** @description Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics. */
    // @DataMember(Name="presence_penalty")
    // @ApiMember(Description="Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics.")
    public presence_penalty?: number;

    /** @description Used by OpenAI to cache responses for similar requests to optimize your cache hit rates. */
    // @DataMember(Name="prompt_cache_key")
    // @ApiMember(Description="Used by OpenAI to cache responses for similar requests to optimize your cache hit rates.")
    public prompt_cache_key?: string;

    /** @description Constrains effort on reasoning for reasoning models. Currently supported values are minimal, low, medium, and high. Reducing reasoning effort can result in faster responses and fewer tokens used on reasoning in a response. */
    // @DataMember(Name="reasoning_effort")
    // @ApiMember(Description="Constrains effort on reasoning for reasoning models. Currently supported values are minimal, low, medium, and high. Reducing reasoning effort can result in faster responses and fewer tokens used on reasoning in a response.")
    public reasoning_effort?: string;

    /** @description An object specifying the format that the model must output. Compatible with GPT-4 Turbo and all GPT-3.5 Turbo models newer than `gpt-3.5-turbo-1106`. Setting Type to ResponseFormat.JsonObject enables JSON mode, which guarantees the message the model generates is valid JSON. */
    // @DataMember(Name="response_format")
    // @ApiMember(Description="An object specifying the format that the model must output. Compatible with GPT-4 Turbo and all GPT-3.5 Turbo models newer than `gpt-3.5-turbo-1106`. Setting Type to ResponseFormat.JsonObject enables JSON mode, which guarantees the message the model generates is valid JSON.")
    public response_format?: OpenAiResponseFormat;

    /** @description A stable identifier used to help detect users of your application that may be violating OpenAI's usage policies. The IDs should be a string that uniquely identifies each user. */
    // @DataMember(Name="safety_identifier")
    // @ApiMember(Description="A stable identifier used to help detect users of your application that may be violating OpenAI's usage policies. The IDs should be a string that uniquely identifies each user.")
    public safety_identifier?: string;

    /** @description This feature is in Beta. If specified, our system will make a best effort to sample deterministically, such that repeated requests with the same seed and parameters should return the same result. Determinism is not guaranteed, and you should refer to the system_fingerprint response parameter to monitor changes in the backend. */
    // @DataMember(Name="seed")
    // @ApiMember(Description="This feature is in Beta. If specified, our system will make a best effort to sample deterministically, such that repeated requests with the same seed and parameters should return the same result. Determinism is not guaranteed, and you should refer to the system_fingerprint response parameter to monitor changes in the backend.")
    public seed?: number;

    /** @description Specifies the processing type used for serving the request. */
    // @DataMember(Name="service_tier")
    // @ApiMember(Description="Specifies the processing type used for serving the request.")
    public service_tier?: string;

    /** @description Up to 4 sequences where the API will stop generating further tokens. */
    // @DataMember(Name="stop")
    // @ApiMember(Description="Up to 4 sequences where the API will stop generating further tokens.")
    public stop?: string[];

    /** @description Whether or not to store the output of this chat completion request for use in our model distillation or evals products. */
    // @DataMember(Name="store")
    // @ApiMember(Description="Whether or not to store the output of this chat completion request for use in our model distillation or evals products.")
    public store?: boolean;

    /** @description If set, partial message deltas will be sent, like in ChatGPT. Tokens will be sent as data-only server-sent events as they become available, with the stream terminated by a `data: [DONE]` message. */
    // @DataMember(Name="stream")
    // @ApiMember(Description="If set, partial message deltas will be sent, like in ChatGPT. Tokens will be sent as data-only server-sent events as they become available, with the stream terminated by a `data: [DONE]` message.")
    public stream?: boolean;

    /** @description What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. */
    // @DataMember(Name="temperature")
    // @ApiMember(Description="What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.")
    public temperature?: number;

    /** @description A list of tools the model may call. Currently, only functions are supported as a tool. Use this to provide a list of functions the model may generate JSON inputs for. A max of 128 functions are supported. */
    // @DataMember(Name="tools")
    // @ApiMember(Description="A list of tools the model may call. Currently, only functions are supported as a tool. Use this to provide a list of functions the model may generate JSON inputs for. A max of 128 functions are supported.")
    public tools?: OpenAiTools[];

    /** @description An integer between 0 and 20 specifying the number of most likely tokens to return at each token position, each with an associated log probability. logprobs must be set to true if this parameter is used. */
    // @DataMember(Name="top_logprobs")
    // @ApiMember(Description="An integer between 0 and 20 specifying the number of most likely tokens to return at each token position, each with an associated log probability. logprobs must be set to true if this parameter is used.")
    public top_logprobs?: number;

    /** @description An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered. */
    // @DataMember(Name="top_p")
    // @ApiMember(Description="An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered.")
    public top_p?: number;

    /** @description Constrains the verbosity of the model's response. Lower values will result in more concise responses, while higher values will result in more verbose responses. Currently supported values are low, medium, and high. */
    // @DataMember(Name="verbosity")
    // @ApiMember(Description="Constrains the verbosity of the model's response. Lower values will result in more concise responses, while higher values will result in more verbose responses. Currently supported values are low, medium, and high.")
    public verbosity?: string;

    public constructor(init?: Partial<ChatCompletion>) { (Object as any).assign(this, init); }
}

// @DataContract
export class AuthenticateResponse implements IHasSessionId, IHasBearerToken
{
    // @DataMember(Order=1)
    public userId: string;

    // @DataMember(Order=2)
    public sessionId: string;

    // @DataMember(Order=3)
    public userName: string;

    // @DataMember(Order=4)
    public displayName: string;

    // @DataMember(Order=5)
    public referrerUrl: string;

    // @DataMember(Order=6)
    public bearerToken: string;

    // @DataMember(Order=7)
    public refreshToken: string;

    // @DataMember(Order=8)
    public refreshTokenExpiry?: string;

    // @DataMember(Order=9)
    public profileUrl: string;

    // @DataMember(Order=10)
    public roles: string[];

    // @DataMember(Order=11)
    public permissions: string[];

    // @DataMember(Order=12)
    public authProvider: string;

    // @DataMember(Order=13)
    public responseStatus: ResponseStatus;

    // @DataMember(Order=14)
    public meta: { [index:string]: string; };

    public constructor(init?: Partial<AuthenticateResponse>) { (Object as any).assign(this, init); }
}

// @ValidateRequest(Validator="IsAdmin")
export class GetPendingArtifactTasks implements IReturn<GetPendingArtifactTasksResponse>, IGet
{

    public constructor(init?: Partial<GetPendingArtifactTasks>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetPendingArtifactTasks'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new GetPendingArtifactTasksResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class FixGenerations implements IReturn<StringsResponse>, IPost
{
    public take?: number;
    public type?: string;

    public constructor(init?: Partial<FixGenerations>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'FixGenerations'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringsResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class UpdateAudioTags implements IReturn<StringsResponse>, IPost
{
    // @Validate(Validator="NotEmpty")
    public artifactPath: string;

    public artifactTags: { [index:string]: number; } = {};

    public constructor(init?: Partial<UpdateAudioTags>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'UpdateAudioTags'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringsResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class HardDeleteWorkflow implements IReturn<StringResponse>, IDeleteDb<Workflow>
{
    // @Validate(Validator="GreaterThan(0)")
    public id: number;

    public force: boolean;

    public constructor(init?: Partial<HardDeleteWorkflow>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'HardDeleteWorkflow'; }
    public getMethod() { return 'DELETE'; }
    public createResponse() { return new StringResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class HardDeleteGenerations implements IReturn<HardDeleteGenerationsResponse>, IPost
{
    public limit: number;
    public delete: boolean;

    public constructor(init?: Partial<HardDeleteGenerations>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'HardDeleteGenerations'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new HardDeleteGenerationsResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class HardDeleteWorkflowGeneration implements IReturn<StringResponse>, IDeleteDb<WorkflowGeneration>
{
    // @Validate(Validator="NotEmpty")
    public id: string;

    public constructor(init?: Partial<HardDeleteWorkflowGeneration>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'HardDeleteWorkflowGeneration'; }
    public getMethod() { return 'DELETE'; }
    public createResponse() { return new StringResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class HardDeleteArtifact implements IReturn<StringsResponse>, IPost
{
    public artifactId: number;

    public constructor(init?: Partial<HardDeleteArtifact>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'HardDeleteArtifact'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringsResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class DeleteMissingArtifacts implements IReturn<StringsResponse>, IPost
{
    public delete: boolean;

    public constructor(init?: Partial<DeleteMissingArtifacts>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'DeleteMissingArtifacts'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringsResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class DeleteDuplicateArtifacts implements IReturn<DeleteDuplicateArtifactsResponse>, IPost
{
    public delete: boolean;

    public constructor(init?: Partial<DeleteDuplicateArtifacts>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'DeleteDuplicateArtifacts'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new DeleteDuplicateArtifactsResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class PopulateMissingArtifacts implements IReturn<StringsResponse>, IPost
{
    public populate: boolean;

    public constructor(init?: Partial<PopulateMissingArtifacts>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'PopulateMissingArtifacts'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringsResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class RegenerateGenerationResults implements IReturn<StringResponse>, IPost
{
    public regenerate: boolean;

    public constructor(init?: Partial<RegenerateGenerationResults>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'RegenerateGenerationResults'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class RequeueFailedThreadGenerations implements IReturn<StringResponse>, IPost
{
    // @Validate(Validator="GreaterThan(0)")
    public threadId: number;

    public constructor(init?: Partial<RequeueFailedThreadGenerations>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'RequeueFailedThreadGenerations'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class Clean implements IReturn<CleanResponse>, IPost
{
    public force: boolean;

    public constructor(init?: Partial<Clean>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'Clean'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new CleanResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class RecreateArtifactCategories implements IReturn<StringResponse>, IPost
{

    public constructor(init?: Partial<RecreateArtifactCategories>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'RecreateArtifactCategories'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class RecreateArtifactTags implements IReturn<StringResponse>, IPost
{

    public constructor(init?: Partial<RecreateArtifactTags>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'RecreateArtifactTags'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class CreateMissingArtifactTags implements IReturn<CreateMissingArtifactTagsResponse>, IPost
{

    public constructor(init?: Partial<CreateMissingArtifactTags>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'CreateMissingArtifactTags'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new CreateMissingArtifactTagsResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class CreateMissingArtifactCategories implements IReturn<CreateMissingArtifactCategoriesResponse>, IPost
{

    public constructor(init?: Partial<CreateMissingArtifactCategories>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'CreateMissingArtifactCategories'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new CreateMissingArtifactCategoriesResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class SendCaptionArtifactEvent implements IReturn<StringsResponse>, IPost
{
    public artifactIds?: number[];
    public model?: string;
    public take?: number;

    public constructor(init?: Partial<SendCaptionArtifactEvent>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'SendCaptionArtifactEvent'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringsResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class ReloadAgentEvents implements IReturn<StringResponse>, IPost
{

    public constructor(init?: Partial<ReloadAgentEvents>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'ReloadAgentEvents'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class GenerateCaptionArtifact implements IReturn<StringsResponse>, IPost
{
    public artifactIds?: number[];
    public model?: string;
    public take?: number;

    public constructor(init?: Partial<GenerateCaptionArtifact>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GenerateCaptionArtifact'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringsResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class CreateMissingAvatars implements IReturn<StringsResponse>, IPost
{

    public constructor(init?: Partial<CreateMissingAvatars>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'CreateMissingAvatars'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringsResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class MigrateToPostgres implements IReturn<StringResponse>, IGet
{

    public constructor(init?: Partial<MigrateToPostgres>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'MigrateToPostgres'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new StringResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class AiChat implements IReturn<StringResponse>, IPost
{
    public model?: string;
    // @Validate(Validator="NotEmpty")
    public prompt: string;

    public systemPrompt?: string;

    public constructor(init?: Partial<AiChat>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'AiChat'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class GetAiChat implements IReturn<GetAiChatResponse>, IGet
{
    public id?: number;
    public includeDetails?: boolean;

    public constructor(init?: Partial<GetAiChat>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetAiChat'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new GetAiChatResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class ResizeImages implements IReturn<StringsResponse>, IPost
{
    public id?: string;
    public width?: number;
    public height?: number;
    public limit?: number;

    public constructor(init?: Partial<ResizeImages>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'ResizeImages'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringsResponse(); }
}

export class UpdateComfyAgent implements IReturn<EmptyResponse>, IPost
{
    // @Validate(Validator="NotEmpty")
    // @Validate(Validator="ExactLength(32)")
    public deviceId: string;

    public queueCount: number;
    public status?: string;
    public error?: ResponseStatus;
    public gpus?: GpuInfo[];
    public models?: { [index:string]: string[]; };
    public languageModels?: string[];
    public installedPip?: string[];
    public installedNodes?: string[];
    public installedModels?: string[];
    public runningGenerationIds?: string[];
    public queuedGenerationIds?: string[];

    public constructor(init?: Partial<UpdateComfyAgent>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'UpdateComfyAgent'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new EmptyResponse(); }
}

export class UpdateComfyAgentStatus implements IReturn<EmptyResponse>, IPost
{
    // @Validate(Validator="NotEmpty")
    // @Validate(Validator="ExactLength(32)")
    public deviceId: string;

    public status?: string;
    public logs?: string;
    public error?: ResponseStatus;

    public constructor(init?: Partial<UpdateComfyAgentStatus>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'UpdateComfyAgentStatus'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new EmptyResponse(); }
}

export class GetComfyAgentEvents implements IReturn<GetComfyAgentEventsResponse>, IGet
{
    // @Validate(Validator="NotEmpty")
    // @Validate(Validator="ExactLength(32)")
    public deviceId: string;

    public constructor(init?: Partial<GetComfyAgentEvents>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetComfyAgentEvents'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new GetComfyAgentEventsResponse(); }
}

export class TestGenerations implements IReturn<WorkflowGeneration[]>, IGet
{
    public deviceId: string;

    public constructor(init?: Partial<TestGenerations>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'TestGenerations'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new Array<WorkflowGeneration>(); }
}

export class RegisterComfyAgent implements IReturn<RegisterComfyAgentResponse>, IPost
{
    // @Validate(Validator="NotEmpty")
    // @Validate(Validator="ExactLength(32)")
    public deviceId: string;

    public version: number;
    public comfyVersion: string;
    public workflows: string[] = [];
    public queueCount: number;
    public gpus?: GpuInfo[];
    public models?: { [index:string]: string[]; };
    public languageModels?: string[];
    public installedPip?: string[];
    public installedNodes?: string[];
    public installedModels?: string[];
    public config: ComfyAgentConfig;

    public constructor(init?: Partial<RegisterComfyAgent>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'RegisterComfyAgent'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new RegisterComfyAgentResponse(); }
}

export class UnRegisterComfyAgent implements IReturn<EmptyResponse>, IPost
{
    // @Validate(Validator="NotEmpty")
    // @Validate(Validator="ExactLength(32)")
    public deviceId: string;

    public constructor(init?: Partial<UnRegisterComfyAgent>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'UnRegisterComfyAgent'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new EmptyResponse(); }
}

export class UpdateWorkflowGeneration implements IReturn<EmptyResponse>, IPost
{
    // @Validate(Validator="NotEmpty")
    public id: string;

    // @Validate(Validator="NotEmpty")
    public deviceId: string;

    public promptId?: string;
    public status?: string;
    public outputs?: string;
    public queueCount?: number;
    public error?: ResponseStatus;

    public constructor(init?: Partial<UpdateWorkflowGeneration>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'UpdateWorkflowGeneration'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new EmptyResponse(); }
}

export class AgentData implements IReturn<AgentDataResponse>, IGet
{
    // @Validate(Validator="NotEmpty")
    public deviceId: string;

    public constructor(init?: Partial<AgentData>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'AgentData'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new AgentDataResponse(); }
}

export class GetArtifactClassificationTasks implements IReturn<QueryResponse<ArtifactRef>>, IGet
{
    // @Validate(Validator="NotEmpty")
    public deviceId: string;

    // @Validate(Validator="NotEmpty")
    public types: AssetType[] = [];

    public take?: number;
    public waitFor?: number;

    public constructor(init?: Partial<GetArtifactClassificationTasks>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetArtifactClassificationTasks'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new QueryResponse<ArtifactRef>(); }
}

export class CompleteArtifactClassificationTask implements IReturn<EmptyResponse>, IPost
{
    // @Validate(Validator="NotEmpty")
    public deviceId: string;

    public artifactId: number;
    public tags?: { [index:string]: number; };
    public categories?: { [index:string]: number; };
    public objects?: ObjectDetection[];
    public ratings?: Ratings;
    public phash?: string;
    public color?: string;
    public error?: ResponseStatus;

    public constructor(init?: Partial<CompleteArtifactClassificationTask>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'CompleteArtifactClassificationTask'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new EmptyResponse(); }
}

export class GetPopularCategories implements IReturn<GetPopularCategoriesResponse>, IGet
{
    public type: AssetType;
    public take?: number;

    public constructor(init?: Partial<GetPopularCategories>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetPopularCategories'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new GetPopularCategoriesResponse(); }
}

export class QueryArtifacts extends QueryDb_1<Artifact> implements IReturn<QueryResponse<Artifact>>
{
    public id?: number;
    public search?: string;
    public rating?: Rating;
    public ratings?: Rating[];
    public category?: string;
    public tag?: string;
    public versionId?: number;
    public similar?: number;
    public type?: AssetType;
    public userId?: string;
    public user?: string;

    public constructor(init?: Partial<QueryArtifacts>) { super(init); (Object as any).assign(this, init); }
    public getTypeName() { return 'QueryArtifacts'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new QueryResponse<Artifact>(); }
}

export class GetArtifactVariants implements IReturn<QueryResponse<Artifact>>, IGet
{
    public generationId?: string;
    public artifactIds?: number[];

    public constructor(init?: Partial<GetArtifactVariants>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetArtifactVariants'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new QueryResponse<Artifact>(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class PublishGeneration implements IReturn<EmptyResponse>
{
    // @Validate(Validator="NotEmpty")
    public id: string;

    public constructor(init?: Partial<PublishGeneration>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'PublishGeneration'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new EmptyResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class CreateArtifactReaction implements IReturn<ArtifactReaction>, ICreateDb<ArtifactReaction>
{
    public artifactId: number;
    public reaction: Reaction;

    public constructor(init?: Partial<CreateArtifactReaction>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'CreateArtifactReaction'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new ArtifactReaction(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class DeleteArtifactReaction implements IReturn<IdResponse>, IDeleteDb<ArtifactReaction>
{
    public artifactId: number;
    public reaction: Reaction;

    public constructor(init?: Partial<DeleteArtifactReaction>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'DeleteArtifactReaction'; }
    public getMethod() { return 'DELETE'; }
    public createResponse() { return new IdResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class ModerateArtifact implements IReturn<EmptyResponse>
{
    public id: number;
    public rating?: Rating;
    public tag?: string;

    public constructor(init?: Partial<ModerateArtifact>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'ModerateArtifact'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new EmptyResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class SubmitArtifactModeration implements IReturn<Artifact>
{
    public artifactId: number;
    public hideArtifact?: boolean;
    public rating?: Rating;
    public poorQuality?: number;
    public reportType?: ReportType;
    public reportTag?: ReportTag;
    public reportComment?: string;

    public constructor(init?: Partial<SubmitArtifactModeration>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'SubmitArtifactModeration'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new Artifact(); }
}

// @Route("/appdata")
// @ValidateRequest(Validator="IsAdmin")
export class GetAppData implements IReturn<GetAppDataResponse>, IGet
{

    public constructor(init?: Partial<GetAppData>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetAppData'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new GetAppDataResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class UpdateDevice implements IReturn<OwnerAgentInfo>, IPost
{
    // @Validate(Validator="NotEmpty")
    public deviceId: string;

    public addModelSettings?: { [index:string]: ModelSettings; };

    public constructor(init?: Partial<UpdateDevice>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'UpdateDevice'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new OwnerAgentInfo(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class UpdateComfyAgentSettings implements IReturn<UpdateComfyAgentSettingsResponse>, IPatch
{
    // @Validate(Validator="NotEmpty")
    // @Validate(Validator="ExactLength(32)")
    public deviceId: string;

    public inDevicePool?: boolean;
    public preserveOutputs?: boolean;
    public maxBatchSize?: number;

    public constructor(init?: Partial<UpdateComfyAgentSettings>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'UpdateComfyAgentSettings'; }
    public getMethod() { return 'PATCH'; }
    public createResponse() { return new UpdateComfyAgentSettingsResponse(); }
}

export class DevicePool implements IReturn<QueryResponse<AgentInfo>>, IGet
{
    public afterModifiedDate?: string;

    public constructor(init?: Partial<DevicePool>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'DevicePool'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new QueryResponse<AgentInfo>(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class MyDevices implements IReturn<QueryResponse<OwnerAgentInfo>>, IGet
{
    public afterModifiedDate?: string;

    public constructor(init?: Partial<MyDevices>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'MyDevices'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new QueryResponse<OwnerAgentInfo>(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class RemoveDevice implements IReturn<EmptyResponse>, IPost
{
    // @Validate(Validator="GreaterThan(0)")
    public id: number;

    public constructor(init?: Partial<RemoveDevice>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'RemoveDevice'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new EmptyResponse(); }
}

// @Route("/comfy/tasks")
export class GetComfyTasks implements IReturn<ComfyTasksResponse>, IGet
{
    // @Validate(Validator="NotEmpty")
    // @Validate(Validator="ExactLength(32)")
    public deviceId: string;

    public constructor(init?: Partial<GetComfyTasks>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetComfyTasks'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new ComfyTasksResponse(); }
}

export class GetWorkflowPaths implements IReturn<string[]>, IGet
{

    public constructor(init?: Partial<GetWorkflowPaths>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetWorkflowPaths'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new Array<string>(); }
}

export class GetWorkflowVersion implements IReturn<GetWorkflowVersionResponse>, IGet
{
    public versionId?: number;
    public workflowId?: number;

    public constructor(init?: Partial<GetWorkflowVersion>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetWorkflowVersion'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new GetWorkflowVersionResponse(); }
}

export class GetWorkflowInfo implements IReturn<GetWorkflowInfoResponse>, IGet
{
    // @Validate(Validator="GreaterThan(0)")
    public versionId?: number;

    public workflowId?: number;

    public constructor(init?: Partial<GetWorkflowInfo>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetWorkflowInfo'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new GetWorkflowInfoResponse(); }
}

export class DownloadWorkflowVersion implements IReturn<Blob>, IGet
{
    // @Validate(Validator="GreaterThan(0)")
    public id: number;

    public constructor(init?: Partial<DownloadWorkflowVersion>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'DownloadWorkflowVersion'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new Blob(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class RequeueGeneration implements IReturn<RequeueGenerationResponse>, IPost
{
    // @Validate(Validator="NotEmpty")
    public id: string;

    public constructor(init?: Partial<RequeueGeneration>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'RequeueGeneration'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new RequeueGenerationResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class QueueWorkflow implements IReturn<QueueWorkflowResponse>, IPost
{
    // @Validate(Validator="GreaterThan(0)")
    public workflowId: number;

    public versionId?: number;
    public threadId?: number;
    public description?: string;
    public deviceId?: string;
    public args?: { [index:string]: Object; };

    public constructor(init?: Partial<QueueWorkflow>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'QueueWorkflow'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new QueueWorkflowResponse(); }
}

/** @description Use by Agents to get the API prompt for a generation for execution */
export class GetGenerationApiPrompt implements IReturn<ApiPrompt>, IGet
{
    public id: string;

    public constructor(init?: Partial<GetGenerationApiPrompt>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetGenerationApiPrompt'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new ApiPrompt(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class GetExecutedWorkflowResults implements IReturn<GetExecutedWorkflowResultsResponse>, IGet
{
    public id: string;
    public poll?: boolean;

    public constructor(init?: Partial<GetExecutedWorkflowResults>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetExecutedWorkflowResults'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new GetExecutedWorkflowResultsResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class GetExecutedWorkflowsResults implements IReturn<GetExecutedWorkflowsResultsResponse>, IGet
{
    public ids: string[] = [];
    public poll?: boolean;

    public constructor(init?: Partial<GetExecutedWorkflowsResults>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetExecutedWorkflowsResults'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new GetExecutedWorkflowsResultsResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class WaitForMyWorkflowGenerations implements IReturn<QueryResponse<WorkflowGeneration>>, IGet
{
    public ids: string[] = [];
    public threadId?: number;
    public afterModifiedDate?: string;

    public constructor(init?: Partial<WaitForMyWorkflowGenerations>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'WaitForMyWorkflowGenerations'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new QueryResponse<WorkflowGeneration>(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class UpdateGenerationAsset implements IReturn<EmptyResponse>, IPost
{
    // @Validate(Validator="NotEmpty")
    public generationId: string;

    // @Validate(Validator="NotEmpty")
    public assetUrl: string;

    public rating?: Rating;

    public constructor(init?: Partial<UpdateGenerationAsset>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'UpdateGenerationAsset'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new EmptyResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class DeleteWorkflowGenerationArtifact implements IReturn<WorkflowGeneration>, IDelete
{
    // @Validate(Validator="NotEmpty")
    public generationId: string;

    // @Validate(Validator="NotEmpty")
    public assetUrl: string;

    public constructor(init?: Partial<DeleteWorkflowGenerationArtifact>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'DeleteWorkflowGenerationArtifact'; }
    public getMethod() { return 'DELETE'; }
    public createResponse() { return new WorkflowGeneration(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class PinWorkflowGenerationArtifact implements IReturn<EmptyResponse>, IPost
{
    // @Validate(Validator="NotEmpty")
    public generationId: string;

    // @Validate(Validator="NotEmpty")
    public assetUrl: string;

    public constructor(init?: Partial<PinWorkflowGenerationArtifact>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'PinWorkflowGenerationArtifact'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new EmptyResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class PublishWorkflowGeneration implements IReturn<EmptyResponse>, IPost
{
    // @Validate(Validator="NotEmpty")
    public id: string;

    public constructor(init?: Partial<PublishWorkflowGeneration>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'PublishWorkflowGeneration'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new EmptyResponse(); }
}

export class GetWorkflowGeneration implements IReturn<GetWorkflowGenerationResponse>, IGet
{
    // @Validate(Validator="NotEmpty")
    public id: string;

    public constructor(init?: Partial<GetWorkflowGeneration>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetWorkflowGeneration'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new GetWorkflowGenerationResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class MoveGeneration implements IReturn<EmptyResponse>
{
    public generationId: string;
    public threadId: number;

    public constructor(init?: Partial<MoveGeneration>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'MoveGeneration'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new EmptyResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class PinToWorkflowVersion implements IReturn<EmptyResponse>, IPost
{
    // @Validate(Validator="GreaterThan(0)")
    public versionId: number;

    // @Validate(Validator="NotEmpty")
    public posterImage: string;

    public constructor(init?: Partial<PinToWorkflowVersion>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'PinToWorkflowVersion'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new EmptyResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class FeatureArtifact implements IReturn<Artifact>, IPost
{
    // @Validate(Validator="GreaterThan(0)")
    public artifactId: number;

    public constructor(init?: Partial<FeatureArtifact>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'FeatureArtifact'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new Artifact(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class UnFeatureArtifact implements IReturn<Artifact>, IPost
{
    // @Validate(Validator="GreaterThan(0)")
    public artifactId: number;

    public constructor(init?: Partial<UnFeatureArtifact>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'UnFeatureArtifact'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new Artifact(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class UpdateWorkflowVersion implements IReturn<UpdateWorkflowVersionResponse>, IPost
{
    // @Validate(Validator="GreaterThan(0)")
    public versionId: number;

    public workflow?: string;

    public constructor(init?: Partial<UpdateWorkflowVersion>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'UpdateWorkflowVersion'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new UpdateWorkflowVersionResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class ParseWorkflowVersions implements IReturn<StringsResponse>, IPost
{
    public versionId?: number;

    public constructor(init?: Partial<ParseWorkflowVersions>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'ParseWorkflowVersions'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringsResponse(); }
}

export class ParseWorkflow implements IReturn<ParsedWorkflow>, IPost
{
    public name?: string;
    public json?: string;
    public file?: string;

    public constructor(init?: Partial<ParseWorkflow>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'ParseWorkflow'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new ParsedWorkflow(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class UploadNewWorkflow implements IReturn<UploadNewWorkflowResponse>, IPost
{
    public workflowName?: string;
    // @Validate(Validator="NotEmpty")
    public baseModel: BaseModel;

    public workflow?: string;

    public constructor(init?: Partial<UploadNewWorkflow>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'UploadNewWorkflow'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new UploadNewWorkflowResponse(); }
}

export class FindAssets implements IReturn<FindAssetsResponse>, IGet
{
    public assets: string[] = [];

    public constructor(init?: Partial<FindAssets>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'FindAssets'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new FindAssetsResponse(); }
}

export class FindCustomNodes implements IReturn<FindCustomNodesResponse>, IGet
{
    public types: string[] = [];

    public constructor(init?: Partial<FindCustomNodes>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'FindCustomNodes'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new FindCustomNodesResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class InstallPipPackage implements IReturn<StringResponse>, IPost
{
    // @Validate(Validator="NotEmpty")
    // @Validate(Validator="ExactLength(32)")
    public deviceId: string;

    // @Validate(Validator="NotEmpty")
    public package: string;

    public require?: boolean;

    public constructor(init?: Partial<InstallPipPackage>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'InstallPipPackage'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class UninstallPipPackage implements IReturn<StringResponse>, IPost
{
    // @Validate(Validator="NotEmpty")
    // @Validate(Validator="ExactLength(32)")
    public deviceId: string;

    // @Validate(Validator="NotEmpty")
    public package: string;

    public constructor(init?: Partial<UninstallPipPackage>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'UninstallPipPackage'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class InstallCustomNode implements IReturn<StringResponse>, IPost
{
    // @Validate(Validator="NotEmpty")
    // @Validate(Validator="ExactLength(32)")
    public deviceId: string;

    // @Validate(Validator="NotEmpty")
    public url: string;

    public require?: boolean;

    public constructor(init?: Partial<InstallCustomNode>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'InstallCustomNode'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class UninstallCustomNode implements IReturn<StringResponse>, IPost
{
    // @Validate(Validator="NotEmpty")
    // @Validate(Validator="ExactLength(32)")
    public deviceId: string;

    // @Validate(Validator="NotEmpty")
    public url: string;

    public constructor(init?: Partial<UninstallCustomNode>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'UninstallCustomNode'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class InstallAsset implements IReturn<StringResponse>, IPost
{
    // @Validate(Validator="NotEmpty")
    // @Validate(Validator="ExactLength(32)")
    public deviceId: string;

    // @Validate(Validator="GreaterThan(0)")
    public assetId: number;

    public require?: boolean;

    public constructor(init?: Partial<InstallAsset>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'InstallAsset'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class InstallModel implements IReturn<StringResponse>, IPost
{
    // @Validate(Validator="NotEmpty")
    // @Validate(Validator="ExactLength(32)")
    public deviceId: string;

    // @Validate(Validator="NotEmpty")
    public url: string;

    // @Validate(Validator="NotEmpty")
    public saveTo: string;

    // @Validate(Validator="NotEmpty")
    public fileName: string;

    public token?: string;
    public require?: boolean;

    public constructor(init?: Partial<InstallModel>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'InstallModel'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class DeleteModel implements IReturn<StringResponse>, IPost
{
    // @Validate(Validator="NotEmpty")
    // @Validate(Validator="ExactLength(32)")
    public deviceId: string;

    // @Validate(Validator="NotEmpty")
    public path: string;

    public constructor(init?: Partial<DeleteModel>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'DeleteModel'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class RebootAgent implements IReturn<StringResponse>, IPost
{
    // @Validate(Validator="NotEmpty")
    // @Validate(Validator="ExactLength(32)")
    public deviceId: string;

    public constructor(init?: Partial<RebootAgent>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'RebootAgent'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class AgentCommand implements IReturn<StringResponse>, IPost
{
    // @Validate(Validator="NotEmpty")
    // @Validate(Validator="ExactLength(32)")
    public deviceId: string;

    public command: AgentCommands;
    public args?: { [index:string]: string; };

    public constructor(init?: Partial<AgentCommand>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'AgentCommand'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new StringResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class GetDeviceStatus implements IReturn<GetDeviceStatusResponse>, IGet
{
    // @Validate(Validator="NotEmpty")
    // @Validate(Validator="ExactLength(32)")
    public deviceId: string;

    public poll?: boolean;
    public statusChanged?: string;

    public constructor(init?: Partial<GetDeviceStatus>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetDeviceStatus'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new GetDeviceStatusResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class GetDeviceObjectInfo implements IReturn<string>, IGet
{
    // @Validate(Validator="NotEmpty")
    // @Validate(Validator="ExactLength(32)")
    public deviceId: string;

    public constructor(init?: Partial<GetDeviceObjectInfo>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetDeviceObjectInfo'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return ''; }
}

export class GetDeviceStats implements IReturn<QueryResponse<StatTotal>>, IGet
{
    // @Validate(Validator="GreaterThan(0)")
    public id: number;

    public constructor(init?: Partial<GetDeviceStats>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetDeviceStats'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new QueryResponse<StatTotal>(); }
}

// @Route("/files/{**Path}")
export class DownloadFile implements IReturn<Blob>, IGet
{
    // @Validate(Validator="NotEmpty")
    public path: string;

    public download?: boolean;

    public constructor(init?: Partial<DownloadFile>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'DownloadFile'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new Blob(); }
}

// @Route("/avatar/{UserName}", "GET")
export class GetUserAvatar implements IReturn<Blob>, IGet
{
    public userName: string;

    public constructor(init?: Partial<GetUserAvatar>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetUserAvatar'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new Blob(); }
}

// @Route("/avatars/{**Path}")
export class GetAvatarFile implements IReturn<Blob>, IGet
{
    // @Validate(Validator="NotEmpty")
    public path: string;

    public download?: boolean;

    public constructor(init?: Partial<GetAvatarFile>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetAvatarFile'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new Blob(); }
}

// @Route("/artifacts/{**Path}")
export class GetArtifact implements IReturn<Blob>, IGet
{
    // @Validate(Validator="NotEmpty")
    public path: string;

    public download?: boolean;

    public constructor(init?: Partial<GetArtifact>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetArtifact'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new Blob(); }
}

// @Route("/files/{**Path}")
export class DeleteFile implements IReturn<EmptyResponse>, IDelete
{
    // @Validate(Validator="NotEmpty")
    public path: string;

    public constructor(init?: Partial<DeleteFile>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'DeleteFile'; }
    public getMethod() { return 'DELETE'; }
    public createResponse() { return new EmptyResponse(); }
}

export class DeleteFiles implements IReturn<DeleteFilesResponse>, IPost
{
    public paths: string[] = [];

    public constructor(init?: Partial<DeleteFiles>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'DeleteFiles'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new DeleteFilesResponse(); }
}

// @Route("/variants/{Variant}/{**Path}")
export class GetVariant implements IReturn<Blob>, IGet
{
    // @Validate(Validator="NotEmpty")
    public variant: string;

    // @Validate(Validator="NotEmpty")
    public path: string;

    public constructor(init?: Partial<GetVariant>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetVariant'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new Blob(); }
}

// @Route("/hello/{Name}")
export class Hello implements IReturn<HelloResponse>, IGet
{
    public name?: string;

    public constructor(init?: Partial<Hello>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'Hello'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new HelloResponse(); }
}

export class AdminData implements IReturn<AdminDataResponse>, IGet
{

    public constructor(init?: Partial<AdminData>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'AdminData'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new AdminDataResponse(); }
}

export class GetTagArtifactIds implements IReturn<GetTagArtifactIdsResponse>, IGet
{
    // @Validate(Validator="NotEmpty")
    public tag: string;

    public afterArtifactId?: number;
    public skip?: number;
    public orderBy?: string;

    public constructor(init?: Partial<GetTagArtifactIds>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetTagArtifactIds'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new GetTagArtifactIdsResponse(); }
}

export class GetCategoryArtifactIds implements IReturn<GetCategoryArtifactIdsResponse>, IGet
{
    // @Validate(Validator="NotEmpty")
    public category: string;

    public afterArtifactId?: number;
    public skip?: number;
    public orderBy?: string;

    public constructor(init?: Partial<GetCategoryArtifactIds>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetCategoryArtifactIds'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new GetCategoryArtifactIdsResponse(); }
}

export class GetThread implements IReturn<GetThreadResponse>, IGet
{
    public id?: number;
    public url?: string;

    public constructor(init?: Partial<GetThread>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetThread'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new GetThreadResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class CreateThread implements IReturn<Thread>, ICreateDb<Thread>
{
    // @Validate(Validator="NotEmpty")
    public url: string;

    // @Validate(Validator="NotEmpty")
    public description: string;

    public externalRef?: string;
    public args?: { [index:string]: Object; };
    public refId?: number;
    public refIdStr: string;

    public constructor(init?: Partial<CreateThread>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'CreateThread'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new Thread(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class CreateGenerationComment implements IReturn<Comment>, IPost
{
    public generationId: string;
    public replyId?: number;
    // @Validate(Validator="Length(1,280)")
    public content: string;

    public constructor(init?: Partial<CreateGenerationComment>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'CreateGenerationComment'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new Comment(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class CreateComment implements IReturn<Comment>, ICreateDb<Comment>
{
    public threadId: number;
    public replyId?: number;
    // @Validate(Validator="Length(1,280)")
    public content: string;

    public constructor(init?: Partial<CreateComment>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'CreateComment'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new Comment(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class CreateCommentReport implements IReturnVoid, ICreateDb<CommentReport>
{
    public commentId: number;
    public postReport: PostReport;
    public description?: string;

    public constructor(init?: Partial<CreateCommentReport>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'CreateCommentReport'; }
    public getMethod() { return 'POST'; }
    public createResponse() {}
}

// @ValidateRequest(Validator="IsAuthenticated")
export class CreateCommentReaction implements IReturnVoid, ICreateDb<CommentReaction>
{
    public commentId: number;
    public reaction: Reaction;

    public constructor(init?: Partial<CreateCommentReaction>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'CreateCommentReaction'; }
    public getMethod() { return 'POST'; }
    public createResponse() {}
}

// @ValidateRequest(Validator="IsAuthenticated")
export class DeleteCommentReaction implements IReturnVoid, IDeleteDb<CommentReaction>
{
    public commentId: number;

    public constructor(init?: Partial<DeleteCommentReaction>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'DeleteCommentReaction'; }
    public getMethod() { return 'DELETE'; }
    public createResponse() {}
}

export class GetDeletedRows implements IReturn<GetDeletedRowsResponse>, IGet
{
    public afterId?: number;

    public constructor(init?: Partial<GetDeletedRows>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetDeletedRows'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new GetDeletedRowsResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class MyInfo implements IReturn<UserInfo>, IGet
{

    public constructor(init?: Partial<MyInfo>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'MyInfo'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new UserInfo(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class UpdatePreferences implements IReturn<EmptyResponse>, IPost
{
    public ratings?: Rating[];
    public lastReadNotificationId?: number;
    public lastReadAchievementId?: number;

    public constructor(init?: Partial<UpdatePreferences>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'UpdatePreferences'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new EmptyResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class UpdateUserAvatar implements IReturn<EmptyResponse>, IPost
{
    public avatar?: string;

    public constructor(init?: Partial<UpdateUserAvatar>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'UpdateUserAvatar'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new EmptyResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class ClaimBonusCredits implements IReturn<ClaimBonusCreditsResponse>, IPost
{

    public constructor(init?: Partial<ClaimBonusCredits>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'ClaimBonusCredits'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new ClaimBonusCreditsResponse(); }
}

export class GetChatCompletion implements IReturn<ChatCompletion>, IGet
{
    // @Validate(Validator="NotEmpty")
    // @Validate(Validator="ExactLength(32)")
    public device: string;

    // @Validate(Validator="NotEmpty")
    public models: string[] = [];

    public constructor(init?: Partial<GetChatCompletion>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'GetChatCompletion'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new ChatCompletion(); }
}

export class CompleteChatCompletion extends OpenAiChatResponse implements IReturn<EmptyResponse>, IPost
{
    // @Validate(Validator="NotEmpty")
    public refId: number;

    public constructor(init?: Partial<CompleteChatCompletion>) { super(init); (Object as any).assign(this, init); }
    public getTypeName() { return 'CompleteChatCompletion'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new EmptyResponse(); }
}

/** @description Sign In */
// @Route("/auth", "GET,POST")
// @Route("/auth/{provider}", "POST")
// @Api(Description="Sign In")
// @DataContract
export class Authenticate implements IReturn<AuthenticateResponse>, IPost
{
    /** @description AuthProvider, e.g. credentials */
    // @DataMember(Order=1)
    public provider: string;

    // @DataMember(Order=2)
    public userName: string;

    // @DataMember(Order=3)
    public password: string;

    // @DataMember(Order=4)
    public rememberMe?: boolean;

    // @DataMember(Order=5)
    public accessToken: string;

    // @DataMember(Order=6)
    public accessTokenSecret: string;

    // @DataMember(Order=7)
    public returnUrl: string;

    // @DataMember(Order=8)
    public errorView: string;

    // @DataMember(Order=9)
    public meta: { [index:string]: string; };

    public constructor(init?: Partial<Authenticate>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'Authenticate'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new AuthenticateResponse(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class QueryUsers extends QueryDb_1<User> implements IReturn<QueryResponse<User>>
{
    public id?: string;

    public constructor(init?: Partial<QueryUsers>) { super(init); (Object as any).assign(this, init); }
    public getTypeName() { return 'QueryUsers'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new QueryResponse<User>(); }
}

// @ValidateRequest(Validator="IsAdmin")
export class QueryWorkflowGenerations extends QueryDb_1<WorkflowGeneration> implements IReturn<QueryResponse<WorkflowGeneration>>
{
    public id?: string;

    public constructor(init?: Partial<QueryWorkflowGenerations>) { super(init); (Object as any).assign(this, init); }
    public getTypeName() { return 'QueryWorkflowGenerations'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new QueryResponse<WorkflowGeneration>(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class MyArtifactReactions extends QueryDb_2<ArtifactReaction, ArtifactReactionInfo> implements IReturn<QueryResponse<ArtifactReactionInfo>>
{
    public afterId?: number;

    public constructor(init?: Partial<MyArtifactReactions>) { super(init); (Object as any).assign(this, init); }
    public getTypeName() { return 'MyArtifactReactions'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new QueryResponse<ArtifactReactionInfo>(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class MyAchievements extends QueryDb_2<Achievement, AchievementInfo> implements IReturn<QueryResponse<AchievementInfo>>
{
    public afterId?: number;

    public constructor(init?: Partial<MyAchievements>) { super(init); (Object as any).assign(this, init); }
    public getTypeName() { return 'MyAchievements'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new QueryResponse<AchievementInfo>(); }
}

/** @description Find Bookings */
// @Route("/bookings", "GET")
// @Route("/bookings/{Id}", "GET")
export class QueryBookings extends QueryDb_1<Booking> implements IReturn<QueryResponse<Booking>>
{
    public id?: number;

    public constructor(init?: Partial<QueryBookings>) { super(init); (Object as any).assign(this, init); }
    public getTypeName() { return 'QueryBookings'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new QueryResponse<Booking>(); }
}

/** @description Find Coupons */
// @Route("/coupons", "GET")
export class QueryCoupons extends QueryDb_1<Coupon> implements IReturn<QueryResponse<Coupon>>
{
    public id: string;

    public constructor(init?: Partial<QueryCoupons>) { super(init); (Object as any).assign(this, init); }
    public getTypeName() { return 'QueryCoupons'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new QueryResponse<Coupon>(); }
}

export class QueryWorkflows extends QueryDb_1<Workflow> implements IReturn<QueryResponse<Workflow>>
{
    public afterId?: number;
    public afterModifiedDate?: string;

    public constructor(init?: Partial<QueryWorkflows>) { super(init); (Object as any).assign(this, init); }
    public getTypeName() { return 'QueryWorkflows'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new QueryResponse<Workflow>(); }
}

export class QueryWorkflowVersions extends QueryDb_1<WorkflowVersion> implements IReturn<QueryResponse<WorkflowVersion>>
{
    public afterId?: number;
    public afterModifiedDate?: string;

    public constructor(init?: Partial<QueryWorkflowVersions>) { super(init); (Object as any).assign(this, init); }
    public getTypeName() { return 'QueryWorkflowVersions'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new QueryResponse<WorkflowVersion>(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class MyWorkflowVersionReactions extends QueryDb_2<WorkflowVersionReaction, WorkflowVersionReactionInfo> implements IReturn<QueryResponse<WorkflowVersionReactionInfo>>
{
    public afterId?: number;

    public constructor(init?: Partial<MyWorkflowVersionReactions>) { super(init); (Object as any).assign(this, init); }
    public getTypeName() { return 'MyWorkflowVersionReactions'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new QueryResponse<WorkflowVersionReactionInfo>(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class MyWorkflowGenerations extends QueryDb_1<WorkflowGeneration> implements IReturn<QueryResponse<WorkflowGeneration>>
{
    public ids?: string[];
    public threadId?: number;
    public afterId?: number;
    public afterModifiedDate?: string;

    public constructor(init?: Partial<MyWorkflowGenerations>) { super(init); (Object as any).assign(this, init); }
    public getTypeName() { return 'MyWorkflowGenerations'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new QueryResponse<WorkflowGeneration>(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class MyCreditHistory extends QueryDb_1<CreditLog> implements IReturn<QueryResponse<CreditLog>>
{
    public afterModifiedDate?: string;

    public constructor(init?: Partial<MyCreditHistory>) { super(init); (Object as any).assign(this, init); }
    public getTypeName() { return 'MyCreditHistory'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new QueryResponse<CreditLog>(); }
}

export class QueryAssets extends QueryDb_1<Asset> implements IReturn<QueryResponse<Asset>>
{
    public fileNames: string[];
    public search?: string;
    public name?: string;
    public type?: string;
    public base?: string;
    public fileName?: string;
    public reference?: string;
    public url?: string;
    public length?: number;
    public modifiedBy?: string;
    public afterModifiedDate?: string;

    public constructor(init?: Partial<QueryAssets>) { super(init); (Object as any).assign(this, init); }
    public getTypeName() { return 'QueryAssets'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new QueryResponse<Asset>(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class MyThreads extends QueryDb_1<Thread> implements IReturn<QueryResponse<Thread>>
{
    public afterId?: number;
    public afterModifiedDate?: string;

    public constructor(init?: Partial<MyThreads>) { super(init); (Object as any).assign(this, init); }
    public getTypeName() { return 'MyThreads'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new QueryResponse<Thread>(); }
}

export class QueryComments extends QueryDb_2<Comment, CommentResult> implements IReturn<QueryResponse<CommentResult>>
{
    public threadId?: number;

    public constructor(init?: Partial<QueryComments>) { super(init); (Object as any).assign(this, init); }
    public getTypeName() { return 'QueryComments'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new QueryResponse<CommentResult>(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class QueryCommentReactions extends QueryDb_1<CommentReaction> implements IReturn<QueryResponse<CommentReaction>>
{
    public threadId: number;

    public constructor(init?: Partial<QueryCommentReactions>) { super(init); (Object as any).assign(this, init); }
    public getTypeName() { return 'QueryCommentReactions'; }
    public getMethod() { return 'GET'; }
    public createResponse() { return new QueryResponse<CommentReaction>(); }
}

/** @description Create a new Booking */
// @Route("/bookings", "POST")
// @ValidateRequest(Validator="HasRole(`Employee`)")
export class CreateBooking implements IReturn<IdResponse>, ICreateDb<Booking>
{
    /** @description Name this Booking is for */
    // @Validate(Validator="NotEmpty")
    public name: string;

    public roomType: RoomType;
    // @Validate(Validator="GreaterThan(0)")
    public roomNumber: number;

    // @Validate(Validator="GreaterThan(0)")
    public cost: number;

    // @Required()
    public bookingStartDate: string;

    public bookingEndDate?: string;
    public notes?: string;
    public couponId?: string;

    public constructor(init?: Partial<CreateBooking>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'CreateBooking'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new IdResponse(); }
}

/** @description Update an existing Booking */
// @Route("/booking/{Id}", "PATCH")
// @ValidateRequest(Validator="HasRole(`Employee`)")
export class UpdateBooking implements IReturn<IdResponse>, IPatchDb<Booking>
{
    public id: number;
    public name?: string;
    public roomType?: RoomType;
    // @Validate(Validator="GreaterThan(0)")
    public roomNumber?: number;

    // @Validate(Validator="GreaterThan(0)")
    public cost?: number;

    public bookingStartDate?: string;
    public bookingEndDate?: string;
    public notes?: string;
    public couponId?: string;
    public cancelled?: boolean;

    public constructor(init?: Partial<UpdateBooking>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'UpdateBooking'; }
    public getMethod() { return 'PATCH'; }
    public createResponse() { return new IdResponse(); }
}

/** @description Delete a Booking */
// @Route("/booking/{Id}", "DELETE")
// @ValidateRequest(Validator="HasRole(`Manager`)")
export class DeleteBooking implements IReturnVoid, IDeleteDb<Booking>
{
    public id: number;

    public constructor(init?: Partial<DeleteBooking>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'DeleteBooking'; }
    public getMethod() { return 'DELETE'; }
    public createResponse() {}
}

// @Route("/coupons", "POST")
// @ValidateRequest(Validator="HasRole(`Employee`)")
export class CreateCoupon implements IReturn<IdResponse>, ICreateDb<Coupon>
{
    // @Validate(Validator="NotEmpty")
    public id: string;

    // @Validate(Validator="NotEmpty")
    public description: string;

    // @Validate(Validator="GreaterThan(0)")
    public discount: number;

    // @Validate(Validator="NotNull")
    public expiryDate: string;

    public constructor(init?: Partial<CreateCoupon>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'CreateCoupon'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new IdResponse(); }
}

// @Route("/coupons/{Id}", "PATCH")
// @ValidateRequest(Validator="HasRole(`Employee`)")
export class UpdateCoupon implements IReturn<IdResponse>, IPatchDb<Coupon>
{
    public id: string;
    // @Validate(Validator="NotEmpty")
    public description: string;

    // @Validate(Validator="NotNull")
    // @Validate(Validator="GreaterThan(0)")
    public discount: number;

    // @Validate(Validator="NotNull")
    public expiryDate: string;

    public constructor(init?: Partial<UpdateCoupon>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'UpdateCoupon'; }
    public getMethod() { return 'PATCH'; }
    public createResponse() { return new IdResponse(); }
}

/** @description Delete a Coupon */
// @Route("/coupons/{Id}", "DELETE")
// @ValidateRequest(Validator="HasRole(`Manager`)")
export class DeleteCoupon implements IReturnVoid, IDeleteDb<Coupon>
{
    public id: string;

    public constructor(init?: Partial<DeleteCoupon>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'DeleteCoupon'; }
    public getMethod() { return 'DELETE'; }
    public createResponse() {}
}

// @ValidateRequest(Validator="IsAuthenticated")
export class CreateWorkflowVersionReaction implements IReturn<WorkflowVersionReaction>, ICreateDb<WorkflowVersionReaction>
{
    public versionId: number;
    public reaction: Reaction;

    public constructor(init?: Partial<CreateWorkflowVersionReaction>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'CreateWorkflowVersionReaction'; }
    public getMethod() { return 'POST'; }
    public createResponse() { return new WorkflowVersionReaction(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class DeleteWorkflowVersionReaction implements IReturn<IdResponse>, IDeleteDb<WorkflowVersionReaction>
{
    public versionId: number;
    public reaction: Reaction;

    public constructor(init?: Partial<DeleteWorkflowVersionReaction>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'DeleteWorkflowVersionReaction'; }
    public getMethod() { return 'DELETE'; }
    public createResponse() { return new IdResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class DeleteMyWorkflowGeneration implements IReturn<EmptyResponse>, IDeleteDb<WorkflowGeneration>
{
    public id: string;

    public constructor(init?: Partial<DeleteMyWorkflowGeneration>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'DeleteMyWorkflowGeneration'; }
    public getMethod() { return 'DELETE'; }
    public createResponse() { return new EmptyResponse(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class UpdateThread implements IReturn<Thread>, IPatchDb<Thread>
{
    public id: number;
    public description?: string;
    public args?: { [index:string]: Object; };

    public constructor(init?: Partial<UpdateThread>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'UpdateThread'; }
    public getMethod() { return 'PATCH'; }
    public createResponse() { return new Thread(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class DeleteThread implements IReturnVoid, IDeleteDb<Thread>
{
    public id: number;

    public constructor(init?: Partial<DeleteThread>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'DeleteThread'; }
    public getMethod() { return 'DELETE'; }
    public createResponse() {}
}

// @ValidateRequest(Validator="IsAuthenticated")
export class UpdateComment implements IReturn<Comment>, IPatchDb<Comment>
{
    public id: number;
    public content?: string;

    public constructor(init?: Partial<UpdateComment>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'UpdateComment'; }
    public getMethod() { return 'PATCH'; }
    public createResponse() { return new Comment(); }
}

// @ValidateRequest(Validator="IsAuthenticated")
export class DeleteComment implements IReturnVoid, IDeleteDb<Comment>
{
    public id: number;

    public constructor(init?: Partial<DeleteComment>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'DeleteComment'; }
    public getMethod() { return 'DELETE'; }
    public createResponse() {}
}

// @ValidateRequest(Validator="IsAuthenticated")
export class CreateThreadReaction implements IReturnVoid, ICreateDb<ThreadReaction>
{
    public threadId: number;
    public reaction: Reaction;

    public constructor(init?: Partial<CreateThreadReaction>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'CreateThreadReaction'; }
    public getMethod() { return 'POST'; }
    public createResponse() {}
}

// @ValidateRequest(Validator="IsAuthenticated")
export class DeleteThreadReaction implements IReturn<EmptyResponse>, IDeleteDb<ThreadReaction>
{
    public threadId: number;

    public constructor(init?: Partial<DeleteThreadReaction>) { (Object as any).assign(this, init); }
    public getTypeName() { return 'DeleteThreadReaction'; }
    public getMethod() { return 'DELETE'; }
    public createResponse() { return new EmptyResponse(); }
}
