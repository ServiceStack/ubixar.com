/* Options:
Date: 2025-09-17 13:28:34
Version: 8.81
Tip: To override a DTO option, remove "//" prefix before updating
BaseUrl: http://localhost:5000

//AddServiceStackTypes: True
//AddDocAnnotations: True
//AddDescriptionAsComments: True
//IncludeTypes: 
//ExcludeTypes: 
//DefaultImports: 
*/

"use strict";
export class AuditBase {
    /** @param {{createdDate?:string,createdBy?:string,modifiedDate?:string,modifiedBy?:string,deletedDate?:string,deletedBy?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    createdDate;
    /** @type {string} */
    createdBy;
    /** @type {string} */
    modifiedDate;
    /** @type {string} */
    modifiedBy;
    /** @type {?string} */
    deletedDate;
    /** @type {?string} */
    deletedBy;
}
export class Workflow extends AuditBase {
    /** @param {{id?:number,category?:string,base?:string,name?:string,slug?:string,description?:string,pinVersionId?:number,threadId?:number,tags?:string[],createdDate?:string,createdBy?:string,modifiedDate?:string,modifiedBy?:string,deletedDate?:string,deletedBy?:string}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {string} */
    category;
    /** @type {string} */
    base;
    /** @type {string} */
    name;
    /** @type {string} */
    slug;
    /** @type {string} */
    description;
    /** @type {?number} */
    pinVersionId;
    /** @type {?number} */
    threadId;
    /** @type {?string[]} */
    tags;
}
/** @typedef {'Image'|'Video'|'Audio'|'Animation'|'Text'|'Binary'} */
export var AssetType;
(function (AssetType) {
    AssetType["Image"] = "Image"
    AssetType["Video"] = "Video"
    AssetType["Audio"] = "Audio"
    AssetType["Animation"] = "Animation"
    AssetType["Text"] = "Text"
    AssetType["Binary"] = "Binary"
})(AssetType || (AssetType = {}));
export class ComfyTextOutput {
    /** @param {{nodeId?:string,text?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    nodeId;
    /** @type {?string} */
    text;
}
/** @typedef {'PG'|'PG-13'|'M'|'R'|'X'|'XXX'} */
export var Rating;
(function (Rating) {
    Rating["PG"] = "PG"
    Rating["PG13"] = "PG-13"
    Rating["M"] = "M"
    Rating["R"] = "R"
    Rating["X"] = "X"
    Rating["XXX"] = "XXX"
})(Rating || (Rating = {}));
export class Ratings {
    /** @param {{predicted_rating?:string,confidence?:number,all_scores?:{ [index:string]: number; }}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    predicted_rating;
    /** @type {number} */
    confidence;
    /** @type {{ [index:string]: number; }} */
    all_scores = {};
}
export class ObjectDetection {
    /** @param {{model?:string,class?:string,score?:number,box?:number[]}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?string} */
    model;
    /** @type {string} */
    class;
    /** @type {number} */
    score;
    /** @type {number[]} */
    box = [];
}
export class ComfyAssetOutput {
    /** @param {{nodeId?:string,url?:string,type?:AssetType,fileName?:string,width?:number,height?:number,length?:number,rating?:Rating,ratings?:Ratings,tags?:{ [index:string]: number; },categories?:{ [index:string]: number; },objects?:ObjectDetection[],phash?:string,color?:string,codec?:string,duration?:number,bitrate?:number,streams?:number,programs?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    nodeId;
    /** @type {string} */
    url;
    /** @type {AssetType} */
    type;
    /** @type {string} */
    fileName;
    /** @type {?number} */
    width;
    /** @type {?number} */
    height;
    /** @type {?number} */
    length;
    /** @type {?Rating} */
    rating;
    /** @type {?Ratings} */
    ratings;
    /** @type {?{ [index:string]: number; }} */
    tags;
    /** @type {?{ [index:string]: number; }} */
    categories;
    /** @type {?ObjectDetection[]} */
    objects;
    /** @type {?string} */
    phash;
    /** @type {?string} */
    color;
    /** @type {?string} */
    codec;
    /** @type {?number} */
    duration;
    /** @type {?number} */
    bitrate;
    /** @type {?number} */
    streams;
    /** @type {?number} */
    programs;
}
export class WorkflowResult {
    /** @param {{clientId?:string,duration?:string,texts?:ComfyTextOutput[],assets?:ComfyAssetOutput[]}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?string} */
    clientId;
    /** @type {?string} */
    duration;
    /** @type {?ComfyTextOutput[]} */
    texts;
    /** @type {?ComfyAssetOutput[]} */
    assets;
}
export class ResponseError {
    /** @param {{errorCode?:string,fieldName?:string,message?:string,meta?:{ [index:string]: string; }}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    errorCode;
    /** @type {string} */
    fieldName;
    /** @type {string} */
    message;
    /** @type {?{ [index:string]: string; }} */
    meta;
}
export class ResponseStatus {
    /** @param {{errorCode?:string,message?:string,stackTrace?:string,errors?:ResponseError[],meta?:{ [index:string]: string; }}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    errorCode;
    /** @type {?string} */
    message;
    /** @type {?string} */
    stackTrace;
    /** @type {?ResponseError[]} */
    errors;
    /** @type {?{ [index:string]: string; }} */
    meta;
}
export class WorkflowGeneration extends AuditBase {
    /** @param {{id?:string,userId?:string,threadId?:number,workflowId?:number,versionId?:number,output?:AssetType,description?:string,checkpoint?:string,lora?:string,embedding?:string,vae?:string,controlNet?:string,upscaler?:string,posterImage?:string,args?:{ [index:string]: Object; },inputs?:string[],requiredNodes?:string[],requiredAssets?:string[],deviceId?:string,promptId?:string,result?:WorkflowResult,error?:ResponseStatus,credits?:number,statusUpdate?:string,publishedBy?:string,publishedDate?:string,publicThreadId?:number,userName?:string,userKarma?:number,createdDate?:string,createdBy?:string,modifiedDate?:string,modifiedBy?:string,deletedDate?:string,deletedBy?:string}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {string} */
    id;
    /** @type {?string} */
    userId;
    /** @type {?number} */
    threadId;
    /** @type {number} */
    workflowId;
    /** @type {?number} */
    versionId;
    /** @type {?AssetType} */
    output;
    /** @type {?string} */
    description;
    /** @type {?string} */
    checkpoint;
    /** @type {?string} */
    lora;
    /** @type {?string} */
    embedding;
    /** @type {?string} */
    vae;
    /** @type {?string} */
    controlNet;
    /** @type {?string} */
    upscaler;
    /** @type {?string} */
    posterImage;
    /** @type {?{ [index:string]: Object; }} */
    args;
    /** @type {?string[]} */
    inputs;
    /** @type {string[]} */
    requiredNodes = [];
    /** @type {string[]} */
    requiredAssets = [];
    /** @type {?string} */
    deviceId;
    /** @type {?string} */
    promptId;
    /** @type {?WorkflowResult} */
    result;
    /** @type {?ResponseStatus} */
    error;
    /** @type {number} */
    credits;
    /** @type {?string} */
    statusUpdate;
    /** @type {?string} */
    publishedBy;
    /** @type {?string} */
    publishedDate;
    /** @type {?number} */
    publicThreadId;
    /** @type {?string} */
    userName;
    /** @type {?number} */
    userKarma;
}
export class GpuInfo {
    /** @param {{index?:number,name?:string,total?:number,free?:number,used?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    index;
    /** @type {string} */
    name;
    /** @type {number} */
    total;
    /** @type {number} */
    free;
    /** @type {number} */
    used;
}
export class ComfyAgentConfig {
    /** @param {{installModels?:boolean,installNodes?:boolean,installPackages?:boolean}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?boolean} */
    installModels;
    /** @type {?boolean} */
    installNodes;
    /** @type {?boolean} */
    installPackages;
}
export class OllamaGenerateResponse {
    /** @param {{model?:string,created_at?:number,response?:string,done?:boolean,done_reason?:string,total_duration?:number,load_duration?:number,prompt_eval_count?:number,prompt_eval_duration?:number,eval_count?:number,prompt_tokens?:number,context?:number[],responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /**
     * @type {string}
     * @description The model used */
    model;
    /**
     * @type {number}
     * @description The Unix timestamp (in seconds) of when the chat completion was created. */
    created_at;
    /**
     * @type {string}
     * @description The full response */
    response;
    /**
     * @type {boolean}
     * @description Whether the response is done */
    done;
    /**
     * @type {string}
     * @description The reason the response completed */
    done_reason;
    /**
     * @type {number}
     * @description Time spent generating the response */
    total_duration;
    /**
     * @type {number}
     * @description Time spent in nanoseconds loading the model */
    load_duration;
    /**
     * @type {number}
     * @description Time spent in nanoseconds evaluating the prompt */
    prompt_eval_count;
    /**
     * @type {number}
     * @description Time spent in nanoseconds evaluating the prompt */
    prompt_eval_duration;
    /**
     * @type {number}
     * @description Number of tokens in the response */
    eval_count;
    /**
     * @type {number}
     * @description Time in nanoseconds spent generating the response */
    prompt_tokens;
    /**
     * @type {?number[]}
     * @description An encoding of the conversation used in this response, this can be sent in the next request to keep a conversational memory */
    context;
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class ToolCall {
    /** @param {{id?:string,type?:string,function?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /**
     * @type {string}
     * @description The ID of the tool call. */
    id;
    /**
     * @type {string}
     * @description The type of the tool. Currently, only `function` is supported. */
    type;
    /**
     * @type {string}
     * @description The function that the model called. */
    function;
}
export class ChoiceMessage {
    /** @param {{content?:string,tool_calls?:ToolCall[],role?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /**
     * @type {string}
     * @description The contents of the message. */
    content;
    /**
     * @type {?ToolCall[]}
     * @description The tool calls generated by the model, such as function calls. */
    tool_calls;
    /**
     * @type {string}
     * @description The role of the author of this message. */
    role;
}
export class Choice {
    /** @param {{finish_reason?:string,index?:number,message?:ChoiceMessage}} [init] */
    constructor(init) { Object.assign(this, init) }
    /**
     * @type {string}
     * @description The reason the model stopped generating tokens. This will be stop if the model hit a natural stop point or a provided stop sequence, length if the maximum number of tokens specified in the request was reached, content_filter if content was omitted due to a flag from our content filters, tool_calls if the model called a tool */
    finish_reason;
    /**
     * @type {number}
     * @description The index of the choice in the list of choices. */
    index;
    /**
     * @type {ChoiceMessage}
     * @description A chat completion message generated by the model. */
    message;
}
export class OpenAiUsage {
    /** @param {{completion_tokens?:number,prompt_tokens?:number,total_tokens?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /**
     * @type {number}
     * @description Number of tokens in the generated completion. */
    completion_tokens;
    /**
     * @type {number}
     * @description Number of tokens in the prompt. */
    prompt_tokens;
    /**
     * @type {number}
     * @description Total number of tokens used in the request (prompt + completion). */
    total_tokens;
}
export class OpenAiChatResponse {
    /** @param {{id?:string,choices?:Choice[],created?:number,model?:string,system_fingerprint?:string,object?:string,usage?:OpenAiUsage,responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /**
     * @type {string}
     * @description A unique identifier for the chat completion. */
    id;
    /**
     * @type {Choice[]}
     * @description A list of chat completion choices. Can be more than one if n is greater than 1. */
    choices = [];
    /**
     * @type {number}
     * @description The Unix timestamp (in seconds) of when the chat completion was created. */
    created;
    /**
     * @type {string}
     * @description The model used for the chat completion. */
    model;
    /**
     * @type {string}
     * @description This fingerprint represents the backend configuration that the model runs with. */
    system_fingerprint;
    /**
     * @type {string}
     * @description The object type, which is always chat.completion. */
    object;
    /**
     * @type {OpenAiUsage}
     * @description Usage statistics for the completion request. */
    usage;
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class QueryBase {
    /** @param {{skip?:number,take?:number,orderBy?:string,orderByDesc?:string,include?:string,fields?:string,meta?:{ [index:string]: string; }}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?number} */
    skip;
    /** @type {?number} */
    take;
    /** @type {?string} */
    orderBy;
    /** @type {?string} */
    orderByDesc;
    /** @type {?string} */
    include;
    /** @type {?string} */
    fields;
    /** @type {?{ [index:string]: string; }} */
    meta;
}
/** @typedef T {any} */
export class QueryDb_1 extends QueryBase {
    /** @param {{skip?:number,take?:number,orderBy?:string,orderByDesc?:string,include?:string,fields?:string,meta?:{ [index:string]: string; }}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
}
/** @typedef {number} */
export var Reaction;
(function (Reaction) {
    Reaction[Reaction["Heart"] = 10084] = "Heart"
    Reaction[Reaction["ThumbsUp"] = 128077] = "ThumbsUp"
    Reaction[Reaction["Laugh"] = 128514] = "Laugh"
    Reaction[Reaction["Cry"] = 128546] = "Cry"
})(Reaction || (Reaction = {}));
export class ArtifactReaction {
    /** @param {{id?:number,artifactId?:number,userId?:string,reaction?:Reaction,createdDate?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {number} */
    artifactId;
    /** @type {string} */
    userId;
    /** @type {Reaction} */
    reaction;
    /** @type {string} */
    createdDate;
}
/** @typedef {'NeedsReview'|'MatureContent'|'TOSViolation'} */
export var ReportType;
(function (ReportType) {
    ReportType["NeedsReview"] = "NeedsReview"
    ReportType["MatureContent"] = "MatureContent"
    ReportType["TOSViolation"] = "TOSViolation"
})(ReportType || (ReportType = {}));
/** @typedef {'Nudity'|'ExplicitNudity'|'SexualActs'|'AdultProducts'|'Underwear'|'Swimwear'|'PartialNudity'|'SexyAttire'|'SexualThemes'|'IntenseGore'|'GraphicViolence'|'WeaponRelatedViolence'|'SelfHarm'|'Death'|'EmaciatedFigures'|'DeceasedBodies'|'Hanging'|'Explosions'|'VisuallyDisturbing'|'OffensiveGestures'|'HateSymbols'|'NaziRelatedContent'|'RacistContent'|'ReligiousHate'|'HomophobicContent'|'TransphobicContent'|'SexistContent'|'ExtremistContent'|'DepictionOfRealPersonContent'|'FalseImpersonation'|'IllegalContent'|'DepictionOfMinor'|'ChildAbuse'|'Spam'|'ProhibitedPrompts'|'PotentialSecurityConcern'|'ContentShouldBeReviewed'|'IncorrectOrMisleadingContent'|'OtherConcern'} */
export var ReportTag;
(function (ReportTag) {
    ReportTag["Nudity"] = "Nudity"
    ReportTag["ExplicitNudity"] = "ExplicitNudity"
    ReportTag["SexualActs"] = "SexualActs"
    ReportTag["AdultProducts"] = "AdultProducts"
    ReportTag["Underwear"] = "Underwear"
    ReportTag["Swimwear"] = "Swimwear"
    ReportTag["PartialNudity"] = "PartialNudity"
    ReportTag["SexyAttire"] = "SexyAttire"
    ReportTag["SexualThemes"] = "SexualThemes"
    ReportTag["IntenseGore"] = "IntenseGore"
    ReportTag["GraphicViolence"] = "GraphicViolence"
    ReportTag["WeaponRelatedViolence"] = "WeaponRelatedViolence"
    ReportTag["SelfHarm"] = "SelfHarm"
    ReportTag["Death"] = "Death"
    ReportTag["EmaciatedFigures"] = "EmaciatedFigures"
    ReportTag["DeceasedBodies"] = "DeceasedBodies"
    ReportTag["Hanging"] = "Hanging"
    ReportTag["Explosions"] = "Explosions"
    ReportTag["VisuallyDisturbing"] = "VisuallyDisturbing"
    ReportTag["OffensiveGestures"] = "OffensiveGestures"
    ReportTag["HateSymbols"] = "HateSymbols"
    ReportTag["NaziRelatedContent"] = "NaziRelatedContent"
    ReportTag["RacistContent"] = "RacistContent"
    ReportTag["ReligiousHate"] = "ReligiousHate"
    ReportTag["HomophobicContent"] = "HomophobicContent"
    ReportTag["TransphobicContent"] = "TransphobicContent"
    ReportTag["SexistContent"] = "SexistContent"
    ReportTag["ExtremistContent"] = "ExtremistContent"
    ReportTag["DepictionOfRealPersonContent"] = "DepictionOfRealPersonContent"
    ReportTag["FalseImpersonation"] = "FalseImpersonation"
    ReportTag["IllegalContent"] = "IllegalContent"
    ReportTag["DepictionOfMinor"] = "DepictionOfMinor"
    ReportTag["ChildAbuse"] = "ChildAbuse"
    ReportTag["Spam"] = "Spam"
    ReportTag["ProhibitedPrompts"] = "ProhibitedPrompts"
    ReportTag["PotentialSecurityConcern"] = "PotentialSecurityConcern"
    ReportTag["ContentShouldBeReviewed"] = "ContentShouldBeReviewed"
    ReportTag["IncorrectOrMisleadingContent"] = "IncorrectOrMisleadingContent"
    ReportTag["OtherConcern"] = "OtherConcern"
})(ReportTag || (ReportTag = {}));
export class ModelSettings {
    /** @param {{maxBatchSize?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?number} */
    maxBatchSize;
}
/** @typedef {'AuraFlow'|'SDXL'|'SD 1.x'|'SD 2.x'|'SD 3'|'SD 3.5'|'SD 3.5 Medium'|'SD 3.5 Large'|'SD 3.5 Large Turbo'|'SDXL Lightning'|'StableAudio'|'Stable Video Diffusion'|'FLUX.1 Schnell'|'Flux.1 Dev'|'Flux.1 Kontext'|'HiDream'|'QwenImage'|'Hunyuan1'|'HunyuanVideo'|'Lumina'|'Pony'|'NoobAI'|'Illustrious'|'PixArt-α'|'PixArt-Σ'|'Hunyuan 1.x'|'Mochi'|'LTXV'|'CogVideoX'|'WanVideo 1.3B'|'WanVideo 14B'|'WanVideo 14B 480p'|'WanVideo 14B 720p'|'Other'} */
export var BaseModel;
(function (BaseModel) {
    BaseModel["AuraFlow"] = "AuraFlow"
    BaseModel["SDXL"] = "SDXL"
    BaseModel["SD1"] = "SD 1.x"
    BaseModel["SD2"] = "SD 2.x"
    BaseModel["SD3"] = "SD 3"
    BaseModel["SD35"] = "SD 3.5"
    BaseModel["SD35Medium"] = "SD 3.5 Medium"
    BaseModel["SD35Large"] = "SD 3.5 Large"
    BaseModel["SD35LargeTurbo"] = "SD 3.5 Large Turbo"
    BaseModel["SDXLLightning"] = "SDXL Lightning"
    BaseModel["StableAudio"] = "StableAudio"
    BaseModel["SVD"] = "Stable Video Diffusion"
    BaseModel["Flux1S"] = "FLUX.1 Schnell"
    BaseModel["Flux1D"] = "Flux.1 Dev"
    BaseModel["Flux1Kontext"] = "Flux.1 Kontext"
    BaseModel["HiDream"] = "HiDream"
    BaseModel["QwenImage"] = "QwenImage"
    BaseModel["Hunyuan1"] = "Hunyuan1"
    BaseModel["HunyuanVideo"] = "HunyuanVideo"
    BaseModel["Lumina"] = "Lumina"
    BaseModel["Pony"] = "Pony"
    BaseModel["NoobAI"] = "NoobAI"
    BaseModel["Illustrious"] = "Illustrious"
    BaseModel["PixArtA"] = "PixArt-α"
    BaseModel["PixArtE"] = "PixArt-Σ"
    BaseModel["Kolors"] = "Hunyuan 1.x"
    BaseModel["Mochi"] = "Mochi"
    BaseModel["LTXV"] = "LTXV"
    BaseModel["CogVideoX"] = "CogVideoX"
    BaseModel["WanVideo13B"] = "WanVideo 1.3B"
    BaseModel["WanVideo14B"] = "WanVideo 14B"
    BaseModel["WanVideo14B480p"] = "WanVideo 14B 480p"
    BaseModel["WanVideo14B720p"] = "WanVideo 14B 720p"
    BaseModel["Other"] = "Other"
})(BaseModel || (BaseModel = {}));
/** @typedef {'Refresh'|'Register'|'Reboot'} */
export var AgentCommands;
(function (AgentCommands) {
    AgentCommands["Refresh"] = "Refresh"
    AgentCommands["Register"] = "Register"
    AgentCommands["Reboot"] = "Reboot"
})(AgentCommands || (AgentCommands = {}));
export class Poco {
    /** @param {{name?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    name;
}
export class Thread extends AuditBase {
    /** @param {{id?:number,url?:string,description?:string,externalRef?:string,viewCount?:number,likesCount?:number,commentsCount?:number,args?:{ [index:string]: Object; },refId?:number,refIdStr?:string,closedDate?:string,reactions?:{ [index:string]: number; },reactionsCount?:number,createdDate?:string,createdBy?:string,modifiedDate?:string,modifiedBy?:string,deletedDate?:string,deletedBy?:string}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {string} */
    url;
    /** @type {string} */
    description;
    /** @type {?string} */
    externalRef;
    /** @type {number} */
    viewCount;
    /** @type {number} */
    likesCount;
    /** @type {number} */
    commentsCount;
    /** @type {?{ [index:string]: Object; }} */
    args;
    /** @type {?number} */
    refId;
    /** @type {string} */
    refIdStr;
    /** @type {?string} */
    closedDate;
    /** @type {{ [index:string]: number; }} */
    reactions = {};
    /** @type {number} */
    reactionsCount;
}
export class Comment extends AuditBase {
    /** @param {{id?:number,threadId?:number,replyId?:number,content?:string,flagReason?:string,notes?:string,userId?:string,reactions?:{ [index:string]: number; },reactionsCount?:number,createdDate?:string,createdBy?:string,modifiedDate?:string,modifiedBy?:string,deletedDate?:string,deletedBy?:string}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {number} */
    threadId;
    /** @type {?number} */
    replyId;
    /** @type {string} */
    content;
    /** @type {?string} */
    flagReason;
    /** @type {?string} */
    notes;
    /** @type {string} */
    userId;
    /** @type {{ [index:string]: number; }} */
    reactions = {};
    /** @type {number} */
    reactionsCount;
}
/** @typedef {'Offensive'|'Spam'|'Nudity'|'Illegal'|'Other'} */
export var PostReport;
(function (PostReport) {
    PostReport["Offensive"] = "Offensive"
    PostReport["Spam"] = "Spam"
    PostReport["Nudity"] = "Nudity"
    PostReport["Illegal"] = "Illegal"
    PostReport["Other"] = "Other"
})(PostReport || (PostReport = {}));
/** @typedef {'None'|'Approve'|'Deny'|'Flag'|'Delete'|'Ban1Day'|'Ban1Week'|'Ban1Month'|'PermanentBan'} */
export var ModerationDecision;
(function (ModerationDecision) {
    ModerationDecision["None"] = "None"
    ModerationDecision["Approve"] = "Approve"
    ModerationDecision["Deny"] = "Deny"
    ModerationDecision["Flag"] = "Flag"
    ModerationDecision["Delete"] = "Delete"
    ModerationDecision["Ban1Day"] = "Ban1Day"
    ModerationDecision["Ban1Week"] = "Ban1Week"
    ModerationDecision["Ban1Month"] = "Ban1Month"
    ModerationDecision["PermanentBan"] = "PermanentBan"
})(ModerationDecision || (ModerationDecision = {}));
export class CommentReport {
    /** @param {{id?:number,commentId?:number,comment?:Comment,userId?:string,postReport?:PostReport,description?:string,createdDate?:string,moderation?:ModerationDecision,notes?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {number} */
    commentId;
    /** @type {Comment} */
    comment;
    /** @type {string} */
    userId;
    /** @type {PostReport} */
    postReport;
    /** @type {string} */
    description;
    /** @type {string} */
    createdDate;
    /** @type {ModerationDecision} */
    moderation;
    /** @type {?string} */
    notes;
}
export class CommentReaction {
    /** @param {{id?:number,commentId?:number,reaction?:Reaction,userId?:string,createdDate?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {number} */
    commentId;
    /** @type {Reaction} */
    reaction;
    /** @type {string} */
    userId;
    /** @type {string} */
    createdDate;
}
/** @typedef {'OpenAiChat'|'OllamaGenerate'} */
export var AiTaskType;
(function (AiTaskType) {
    AiTaskType["OpenAiChat"] = "OpenAiChat"
    AiTaskType["OllamaGenerate"] = "OllamaGenerate"
})(AiTaskType || (AiTaskType = {}));
export class UserPrefs {
    /** @param {{lastReadNotificationId?:number,lastReadAchievementId?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    lastReadNotificationId;
    /** @type {number} */
    lastReadAchievementId;
}
/** @typedef {'Free'|'Contributor'|'Plus'|'Pro'|'Moderator'} */
export var QuotaTier;
(function (QuotaTier) {
    QuotaTier["Free"] = "Free"
    QuotaTier["Contributor"] = "Contributor"
    QuotaTier["Plus"] = "Plus"
    QuotaTier["Pro"] = "Pro"
    QuotaTier["Moderator"] = "Moderator"
})(QuotaTier || (QuotaTier = {}));
export class User {
    /** @param {{id?:string,userName?:string,ratings?:Rating[],profileUrl?:string,prefs?:UserPrefs,karma?:number,credits?:number,quotaTier?:QuotaTier,lastBonusDate?:string,modifiedDate?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    id;
    /** @type {string} */
    userName;
    /** @type {Rating[]} */
    ratings = [];
    /** @type {?string} */
    profileUrl;
    /** @type {UserPrefs} */
    prefs;
    /** @type {number} */
    karma;
    /** @type {number} */
    credits;
    /** @type {QuotaTier} */
    quotaTier;
    /** @type {?string} */
    lastBonusDate;
    /** @type {string} */
    modifiedDate;
}
/** @typedef From {any} */
/** @typedef  Into {any} */
export class QueryDb_2 extends QueryBase {
    /** @param {{skip?:number,take?:number,orderBy?:string,orderByDesc?:string,include?:string,fields?:string,meta?:{ [index:string]: string; }}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
}
export class ArtifactReactionInfo {
    /** @param {{id?:number,artifactId?:number,reaction?:Reaction}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {number} */
    artifactId;
    /** @type {Reaction} */
    reaction;
}
/** @typedef {number} */
export var AchievementType;
(function (AchievementType) {
    AchievementType[AchievementType["Unknown"] = 0] = "Unknown"
    AchievementType[AchievementType["PublishedGeneration"] = 1] = "PublishedGeneration"
    AchievementType[AchievementType["ArtifactReaction"] = 2] = "ArtifactReaction"
    AchievementType[AchievementType["CommentReaction"] = 3] = "CommentReaction"
    AchievementType[AchievementType["GenerationComment"] = 4] = "GenerationComment"
    AchievementType[AchievementType["AddedToCollection"] = 5] = "AddedToCollection"
})(AchievementType || (AchievementType = {}));
export class Achievement {
    /** @param {{id?:number,userId?:string,type?:AchievementType,title?:string,generationId?:string,artifactId?:number,refId?:string,refUserId?:string,score?:number,createdDate?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {string} */
    userId;
    /** @type {AchievementType} */
    type;
    /** @type {?string} */
    title;
    /** @type {?string} */
    generationId;
    /** @type {?number} */
    artifactId;
    /** @type {?string} */
    refId;
    /** @type {?string} */
    refUserId;
    /** @type {number} */
    score;
    /** @type {string} */
    createdDate;
}
export class AchievementInfo {
    /** @param {{id?:number,type?:AchievementType,generationId?:string,artifactId?:number,refId?:string,score?:number,created?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {AchievementType} */
    type;
    /** @type {?string} */
    generationId;
    /** @type {?number} */
    artifactId;
    /** @type {?string} */
    refId;
    /** @type {number} */
    score;
    /** @type {number} */
    created;
}
/** @typedef {'Single'|'Double'|'Queen'|'Twin'|'Suite'} */
export var RoomType;
(function (RoomType) {
    RoomType["Single"] = "Single"
    RoomType["Double"] = "Double"
    RoomType["Queen"] = "Queen"
    RoomType["Twin"] = "Twin"
    RoomType["Suite"] = "Suite"
})(RoomType || (RoomType = {}));
export class Coupon {
    /** @param {{id?:string,description?:string,discount?:number,expiryDate?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    id;
    /** @type {string} */
    description;
    /** @type {number} */
    discount;
    /** @type {string} */
    expiryDate;
}
export class Booking extends AuditBase {
    /** @param {{id?:number,name?:string,roomType?:RoomType,roomNumber?:number,bookingStartDate?:string,bookingEndDate?:string,cost?:number,couponId?:string,discount?:Coupon,notes?:string,cancelled?:boolean,employee?:User,createdDate?:string,createdBy?:string,modifiedDate?:string,modifiedBy?:string,deletedDate?:string,deletedBy?:string}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {string} */
    name;
    /** @type {RoomType} */
    roomType;
    /** @type {number} */
    roomNumber;
    /** @type {string} */
    bookingStartDate;
    /** @type {?string} */
    bookingEndDate;
    /** @type {number} */
    cost;
    /** @type {?string} */
    couponId;
    /** @type {Coupon} */
    discount;
    /** @type {?string} */
    notes;
    /** @type {?boolean} */
    cancelled;
    /** @type {User} */
    employee;
}
/** @typedef {'TextToImage'|'ImageToImage'|'ImageToText'|'TextToAudio'|'TextToVideo'|'TextTo3D'|'AudioToText'|'AudioToAudio'|'VideoToText'|'ImageToVideo'} */
export var ComfyWorkflowType;
(function (ComfyWorkflowType) {
    ComfyWorkflowType["TextToImage"] = "TextToImage"
    ComfyWorkflowType["ImageToImage"] = "ImageToImage"
    ComfyWorkflowType["ImageToText"] = "ImageToText"
    ComfyWorkflowType["TextToAudio"] = "TextToAudio"
    ComfyWorkflowType["TextToVideo"] = "TextToVideo"
    ComfyWorkflowType["TextTo3D"] = "TextTo3D"
    ComfyWorkflowType["AudioToText"] = "AudioToText"
    ComfyWorkflowType["AudioToAudio"] = "AudioToAudio"
    ComfyWorkflowType["VideoToText"] = "VideoToText"
    ComfyWorkflowType["ImageToVideo"] = "ImageToVideo"
})(ComfyWorkflowType || (ComfyWorkflowType = {}));
/** @typedef {'Text'|'Image'|'Video'|'Audio'} */
export var ComfyPrimarySource;
(function (ComfyPrimarySource) {
    ComfyPrimarySource["Text"] = "Text"
    ComfyPrimarySource["Image"] = "Image"
    ComfyPrimarySource["Video"] = "Video"
    ComfyPrimarySource["Audio"] = "Audio"
})(ComfyPrimarySource || (ComfyPrimarySource = {}));
/** @typedef {'Unknown'|'Audio'|'Boolean'|'Clip'|'ClipVision'|'ClipVisionOutput'|'Combo'|'Conditioning'|'ControlNet'|'Enum'|'FasterWhisperModel'|'Filepath'|'Fl2Model'|'Float'|'Floats'|'Gligen'|'Guider'|'Hooks'|'Image'|'Int'|'Latent'|'LatentOperation'|'Load3D'|'Load3DAnimation'|'Mask'|'Mesh'|'Model'|'Noise'|'Photomaker'|'Sampler'|'Sigmas'|'String'|'StyleModel'|'Subtitle'|'TranscriptionPipeline'|'Transcriptions'|'UpscaleModel'|'VAE'|'VHSAudio'|'Voxel'|'WavBytes'|'WavBytesBatch'|'Webcam'|'Video'} */
export var ComfyInputType;
(function (ComfyInputType) {
    ComfyInputType["Unknown"] = "Unknown"
    ComfyInputType["Audio"] = "Audio"
    ComfyInputType["Boolean"] = "Boolean"
    ComfyInputType["Clip"] = "Clip"
    ComfyInputType["ClipVision"] = "ClipVision"
    ComfyInputType["ClipVisionOutput"] = "ClipVisionOutput"
    ComfyInputType["Combo"] = "Combo"
    ComfyInputType["Conditioning"] = "Conditioning"
    ComfyInputType["ControlNet"] = "ControlNet"
    ComfyInputType["Enum"] = "Enum"
    ComfyInputType["FasterWhisperModel"] = "FasterWhisperModel"
    ComfyInputType["Filepath"] = "Filepath"
    ComfyInputType["Fl2Model"] = "Fl2Model"
    ComfyInputType["Float"] = "Float"
    ComfyInputType["Floats"] = "Floats"
    ComfyInputType["Gligen"] = "Gligen"
    ComfyInputType["Guider"] = "Guider"
    ComfyInputType["Hooks"] = "Hooks"
    ComfyInputType["Image"] = "Image"
    ComfyInputType["Int"] = "Int"
    ComfyInputType["Latent"] = "Latent"
    ComfyInputType["LatentOperation"] = "LatentOperation"
    ComfyInputType["Load3D"] = "Load3D"
    ComfyInputType["Load3DAnimation"] = "Load3DAnimation"
    ComfyInputType["Mask"] = "Mask"
    ComfyInputType["Mesh"] = "Mesh"
    ComfyInputType["Model"] = "Model"
    ComfyInputType["Noise"] = "Noise"
    ComfyInputType["Photomaker"] = "Photomaker"
    ComfyInputType["Sampler"] = "Sampler"
    ComfyInputType["Sigmas"] = "Sigmas"
    ComfyInputType["String"] = "String"
    ComfyInputType["StyleModel"] = "StyleModel"
    ComfyInputType["Subtitle"] = "Subtitle"
    ComfyInputType["TranscriptionPipeline"] = "TranscriptionPipeline"
    ComfyInputType["Transcriptions"] = "Transcriptions"
    ComfyInputType["UpscaleModel"] = "UpscaleModel"
    ComfyInputType["VAE"] = "VAE"
    ComfyInputType["VHSAudio"] = "VHSAudio"
    ComfyInputType["Voxel"] = "Voxel"
    ComfyInputType["WavBytes"] = "WavBytes"
    ComfyInputType["WavBytesBatch"] = "WavBytesBatch"
    ComfyInputType["Webcam"] = "Webcam"
    ComfyInputType["Video"] = "Video"
})(ComfyInputType || (ComfyInputType = {}));
export class ComfyInputDefinition {
    /** @param {{classType?:string,nodeId?:number,valueIndex?:number,name?:string,label?:string,type?:ComfyInputType,tooltip?:string,default?:Object,min?:number,max?:number,step?:number,round?:number,multiline?:boolean,dynamicPrompts?:boolean,controlAfterGenerate?:boolean,upload?:boolean,enumValues?:string[],comboValues?:{ [index:string]: Object; },placeholder?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    classType;
    /** @type {number} */
    nodeId;
    /** @type {number} */
    valueIndex;
    /** @type {string} */
    name;
    /** @type {string} */
    label;
    /** @type {ComfyInputType} */
    type;
    /** @type {?string} */
    tooltip;
    /** @type {?Object} */
    default;
    /** @type {?number} */
    min;
    /** @type {?number} */
    max;
    /** @type {?number} */
    step;
    /** @type {?number} */
    round;
    /** @type {?boolean} */
    multiline;
    /** @type {?boolean} */
    dynamicPrompts;
    /** @type {?boolean} */
    controlAfterGenerate;
    /** @type {?boolean} */
    upload;
    /** @type {?string[]} */
    enumValues;
    /** @type {?{ [index:string]: Object; }} */
    comboValues;
    /** @type {?string} */
    placeholder;
}
export class AssetInfo {
    /** @param {{asset?:string,url?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    asset;
    /** @type {string} */
    url;
}
export class WorkflowInfo {
    /** @param {{id?:number,parentId?:number,name?:string,type?:ComfyWorkflowType,input?:ComfyPrimarySource,output?:ComfyPrimarySource,inputs?:ComfyInputDefinition[],assets?:AssetInfo[],customNodes?:string[],pipPackages?:string[]}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {number} */
    parentId;
    /** @type {string} */
    name;
    /** @type {ComfyWorkflowType} */
    type;
    /** @type {ComfyPrimarySource} */
    input;
    /** @type {ComfyPrimarySource} */
    output;
    /** @type {ComfyInputDefinition[]} */
    inputs = [];
    /** @type {AssetInfo[]} */
    assets = [];
    /** @type {string[]} */
    customNodes = [];
    /** @type {string[]} */
    pipPackages = [];
}
export class WorkflowVersion extends AuditBase {
    /** @param {{id?:number,parentId?:number,name?:string,version?:string,path?:string,workflow?:{ [index:string]: Object; },info?:WorkflowInfo,nodes?:string[],assets?:string[],posterImage?:string,reactions?:{ [index:string]: number; },reactionsCount?:number,createdDate?:string,createdBy?:string,modifiedDate?:string,modifiedBy?:string,deletedDate?:string,deletedBy?:string}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {number} */
    parentId;
    /** @type {string} */
    name;
    /** @type {string} */
    version;
    /** @type {string} */
    path;
    /** @type {{ [index:string]: Object; }} */
    workflow = {};
    /** @type {WorkflowInfo} */
    info;
    /** @type {string[]} */
    nodes = [];
    /** @type {string[]} */
    assets = [];
    /** @type {string} */
    posterImage;
    /** @type {{ [index:string]: number; }} */
    reactions = {};
    /** @type {number} */
    reactionsCount;
}
export class WorkflowVersionReactionInfo {
    /** @param {{id?:number,versionId?:number,reaction?:Reaction}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {number} */
    versionId;
    /** @type {Reaction} */
    reaction;
}
/** @typedef {'SignupBonus'|'GenerationDebit'|'GenerationCredit'|'DailyBonus'} */
export var CreditReason;
(function (CreditReason) {
    CreditReason["SignupBonus"] = "SignupBonus"
    CreditReason["GenerationDebit"] = "GenerationDebit"
    CreditReason["GenerationCredit"] = "GenerationCredit"
    CreditReason["DailyBonus"] = "DailyBonus"
})(CreditReason || (CreditReason = {}));
export class CreditLog {
    /** @param {{id?:number,userId?:string,credits?:number,reason?:CreditReason,description?:string,refId?:string,refUserId?:string,createdDate?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {string} */
    userId;
    /** @type {number} */
    credits;
    /** @type {?CreditReason} */
    reason;
    /** @type {?string} */
    description;
    /** @type {?string} */
    refId;
    /** @type {?string} */
    refUserId;
    /** @type {string} */
    createdDate;
}
export class Asset {
    /** @param {{id?:number,name?:string,type?:string,base?:string,savePath?:string,fileName?:string,description?:string,reference?:string,url?:string,token?:string,size?:string,length?:number,hash?:string,lastChecked?:string,modifiedDate?:string,modifiedBy?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {string} */
    name;
    /** @type {?string} */
    type;
    /** @type {?string} */
    base;
    /** @type {string} */
    savePath;
    /** @type {string} */
    fileName;
    /** @type {?string} */
    description;
    /** @type {?string} */
    reference;
    /** @type {string} */
    url;
    /** @type {?string} */
    token;
    /** @type {string} */
    size;
    /** @type {number} */
    length;
    /** @type {?string} */
    hash;
    /** @type {?string} */
    lastChecked;
    /** @type {?string} */
    modifiedDate;
    /** @type {?string} */
    modifiedBy;
}
export class CommentResult {
    /** @param {{id?:number,threadId?:number,replyId?:number,content?:string,upVotes?:number,downVotes?:number,votes?:number,flagReason?:string,notes?:string,userName?:string,handle?:string,profileUrl?:string,avatar?:string,createdDate?:string,modifiedDate?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {number} */
    threadId;
    /** @type {?number} */
    replyId;
    /** @type {string} */
    content;
    /** @type {number} */
    upVotes;
    /** @type {number} */
    downVotes;
    /** @type {number} */
    votes;
    /** @type {?string} */
    flagReason;
    /** @type {?string} */
    notes;
    /** @type {string} */
    userName;
    /** @type {?string} */
    handle;
    /** @type {?string} */
    profileUrl;
    /** @type {?string} */
    avatar;
    /** @type {string} */
    createdDate;
    /** @type {string} */
    modifiedDate;
}
export class WorkflowVersionReaction {
    /** @param {{id?:number,versionId?:number,userId?:string,reaction?:Reaction,createdDate?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {number} */
    versionId;
    /** @type {string} */
    userId;
    /** @type {Reaction} */
    reaction;
    /** @type {string} */
    createdDate;
}
export class ThreadReaction {
    /** @param {{id?:number,threadId?:number,reaction?:Reaction,userId?:string,createdDate?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {number} */
    threadId;
    /** @type {Reaction} */
    reaction;
    /** @type {string} */
    userId;
    /** @type {string} */
    createdDate;
}
export class GenerationRef {
    /** @param {{id?:string,positivePrompt?:string,artifactUrls?:string[],artifactPaths?:string[],publicThreadId?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    id;
    /** @type {?string} */
    positivePrompt;
    /** @type {string[]} */
    artifactUrls = [];
    /** @type {string[]} */
    artifactPaths = [];
    /** @type {?number} */
    publicThreadId;
}
export class AgentEvent {
    /** @param {{name?:string,args?:{ [index:string]: string; }}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    name;
    /** @type {?{ [index:string]: string; }} */
    args;
}
export class ComfyAgentSettings {
    /** @param {{inDevicePool?:boolean,preserveOutputs?:boolean}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {boolean} */
    inDevicePool;
    /** @type {boolean} */
    preserveOutputs;
}
export class OllamaGenerateOptions {
    /** @param {{mirostat?:number,mirostat_eta?:number,mirostat_tau?:number,num_ctx?:number,repeat_last_n?:number,repeat_penalty?:number,temperature?:number,seed?:number,stop?:string,num_predict?:number,top_k?:number,top_p?:number,min_p?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /**
     * @type {?number}
     * @description Enable Mirostat sampling for controlling perplexity. (default: 0, 0 = disabled, 1 = Mirostat, 2 = Mirostat 2.0) */
    mirostat;
    /**
     * @type {?number}
     * @description Influences how quickly the algorithm responds to feedback from the generated text. A lower learning rate will result in slower adjustments, while a higher learning rate will make the algorithm more responsive. (Default: 0.1) */
    mirostat_eta;
    /**
     * @type {?number}
     * @description Controls the balance between coherence and diversity of the output. A lower value will result in more focused and coherent text. (Default: 5.0) */
    mirostat_tau;
    /**
     * @type {?number}
     * @description Sets the size of the context window used to generate the next token. (Default: 2048) */
    num_ctx;
    /**
     * @type {?number}
     * @description Sets how far back for the model to look back to prevent repetition. (Default: 64, 0 = disabled, -1 = num_ctx) */
    repeat_last_n;
    /**
     * @type {?number}
     * @description Sets how strongly to penalize repetitions. A higher value (e.g., 1.5) will penalize repetitions more strongly, while a lower value (e.g., 0.9) will be more lenient. (Default: 1.1) */
    repeat_penalty;
    /**
     * @type {?number}
     * @description The temperature of the model. Increasing the temperature will make the model answer more creatively. (Default: 0.8) */
    temperature;
    /**
     * @type {?number}
     * @description Sets the random number seed to use for generation. Setting this to a specific number will make the model generate the same text for the same prompt. (Default: 0) */
    seed;
    /**
     * @type {?string}
     * @description Sets the stop sequences to use. When this pattern is encountered the LLM will stop generating text and return. Multiple stop patterns may be set by specifying multiple separate stop parameters in a modelfile.	 */
    stop;
    /**
     * @type {?number}
     * @description Maximum number of tokens to predict when generating text. (Default: -1, infinite generation) */
    num_predict;
    /**
     * @type {?number}
     * @description Reduces the probability of generating nonsense. A higher value (e.g. 100) will give more diverse answers, while a lower value (e.g. 10) will be more conservative. (Default: 40) */
    top_k;
    /**
     * @type {?number}
     * @description Works together with top-k. A higher value (e.g., 0.95) will lead to more diverse text, while a lower value (e.g., 0.5) will generate more focused and conservative text. (Default: 0.9) */
    top_p;
    /**
     * @type {?number}
     * @description Alternative to the top_p, and aims to ensure a balance of quality and variety. The parameter p represents the minimum probability for a token to be considered, relative to the probability of the most likely token. For example, with p=0.05 and the most likely token having a probability of 0.9, logits with a value less than 0.045 are filtered out. (Default: 0.0) */
    min_p;
}
export class OpenAiMessage {
    /** @param {{content?:string,images?:string[],role?:string,name?:string,tool_calls?:ToolCall[],tool_call_id?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /**
     * @type {string}
     * @description The contents of the message. */
    content;
    /**
     * @type {string[]}
     * @description The images for the message. */
    images = [];
    /**
     * @type {string}
     * @description The role of the author of this message. Valid values are `system`, `user`, `assistant` and `tool`. */
    role;
    /**
     * @type {?string}
     * @description An optional name for the participant. Provides the model information to differentiate between participants of the same role. */
    name;
    /**
     * @type {?ToolCall[]}
     * @description The tool calls generated by the model, such as function calls. */
    tool_calls;
    /**
     * @type {?string}
     * @description Tool call that this message is responding to. */
    tool_call_id;
}
/** @typedef {'text'|'json_object'} */
export var ResponseFormat;
(function (ResponseFormat) {
    ResponseFormat["Text"] = "text"
    ResponseFormat["JsonObject"] = "json_object"
})(ResponseFormat || (ResponseFormat = {}));
export class OpenAiResponseFormat {
    /** @param {{response_format?:ResponseFormat}} [init] */
    constructor(init) { Object.assign(this, init) }
    /**
     * @type {ResponseFormat}
     * @description An object specifying the format that the model must output. Compatible with GPT-4 Turbo and all GPT-3.5 Turbo models newer than gpt-3.5-turbo-1106. */
    response_format;
}
/** @typedef {'function'} */
export var OpenAiToolType;
(function (OpenAiToolType) {
    OpenAiToolType["Function"] = "function"
})(OpenAiToolType || (OpenAiToolType = {}));
export class OpenAiTools {
    /** @param {{type?:OpenAiToolType}} [init] */
    constructor(init) { Object.assign(this, init) }
    /**
     * @type {OpenAiToolType}
     * @description The type of the tool. Currently, only function is supported. */
    type;
}
export class ArtifactRef {
    /** @param {{id?:number,type?:AssetType,url?:string,length?:number,deviceId?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {AssetType} */
    type;
    /** @type {string} */
    url;
    /** @type {number} */
    length;
    /** @type {?string} */
    deviceId;
}
/** @typedef T {any} */
export class QueryResponse {
    /** @param {{offset?:number,total?:number,results?:T[],meta?:{ [index:string]: string; },responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    offset;
    /** @type {number} */
    total;
    /** @type {T[]} */
    results = [];
    /** @type {?{ [index:string]: string; }} */
    meta;
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class CategoryStat {
    /** @param {{id?:number,name?:string,count?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {string} */
    name;
    /** @type {number} */
    count;
}
export class AudioInfo {
    /** @param {{codec?:string,duration?:number,length?:number,bitrate?:number,streams?:number,programs?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?string} */
    codec;
    /** @type {?number} */
    duration;
    /** @type {?number} */
    length;
    /** @type {?number} */
    bitrate;
    /** @type {?number} */
    streams;
    /** @type {?number} */
    programs;
}
export class AgentInfo {
    /** @param {{id?:number,shortId?:string,userId?:string,gpus?:GpuInfo[],nodes?:string[],models?:{ [index:string]: string[]; },languageModels?:string[],requirePip?:string[],requireNodes?:string[],requireModels?:string[],installedPip?:string[],installedNodes?:string[],installedModels?:string[],hiddenModels?:string[],enabled?:boolean,offlineDate?:string,createdDate?:string,modifiedDate?:string,lastUpdate?:string,queueCount?:number,devicePool?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {string} */
    shortId;
    /** @type {string} */
    userId;
    /** @type {?GpuInfo[]} */
    gpus;
    /** @type {string[]} */
    nodes = [];
    /** @type {{ [index:string]: string[]; }} */
    models = {};
    /** @type {?string[]} */
    languageModels;
    /** @type {?string[]} */
    requirePip;
    /** @type {?string[]} */
    requireNodes;
    /** @type {?string[]} */
    requireModels;
    /** @type {?string[]} */
    installedPip;
    /** @type {?string[]} */
    installedNodes;
    /** @type {?string[]} */
    installedModels;
    /** @type {?string[]} */
    hiddenModels;
    /** @type {boolean} */
    enabled;
    /** @type {?string} */
    offlineDate;
    /** @type {string} */
    createdDate;
    /** @type {string} */
    modifiedDate;
    /** @type {string} */
    lastUpdate;
    /** @type {number} */
    queueCount;
    /** @type {?string} */
    devicePool;
}
/** @typedef {'Queued'|'Assigned'|'Started'|'Executed'|'Completed'|'Failed'|'Cancelled'} */
export var TaskState;
(function (TaskState) {
    TaskState["Queued"] = "Queued"
    TaskState["Assigned"] = "Assigned"
    TaskState["Started"] = "Started"
    TaskState["Executed"] = "Executed"
    TaskState["Completed"] = "Completed"
    TaskState["Failed"] = "Failed"
    TaskState["Cancelled"] = "Cancelled"
})(TaskState || (TaskState = {}));
export class AiTaskInfo {
    /** @param {{id?:number,model?:string,task?:string,taskId?:string,state?:TaskState,status?:string,errorCode?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {string} */
    model;
    /** @type {string} */
    task;
    /** @type {string} */
    taskId;
    /** @type {TaskState} */
    state;
    /** @type {?string} */
    status;
    /** @type {?string} */
    errorCode;
}
export class ComfyTask {
    /** @param {{id?:number,name?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {string} */
    name;
}
export class ApiNode {
    /** @param {{inputs?:{ [index:string]: Object; },class_type?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {{ [index:string]: Object; }} */
    inputs = {};
    /** @type {string} */
    class_type;
}
export class StatTotal {
    /** @param {{name?:string,count?:number,credits?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    name;
    /** @type {number} */
    count;
    /** @type {number} */
    credits;
}
export class PageStats {
    /** @param {{label?:string,total?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    label;
    /** @type {number} */
    total;
}
/** @typedef {number} */
export var Table;
(function (Table) {
    Table[Table["Artifact"] = 1] = "Artifact"
    Table[Table["ArtifactTag"] = 2] = "ArtifactTag"
    Table[Table["ArtifactCategory"] = 3] = "ArtifactCategory"
    Table[Table["ArtifactReaction"] = 4] = "ArtifactReaction"
    Table[Table["HiddenArtifact"] = 5] = "HiddenArtifact"
    Table[Table["Thread"] = 6] = "Thread"
    Table[Table["Comment"] = 7] = "Comment"
    Table[Table["Workflow"] = 8] = "Workflow"
    Table[Table["WorkflowGeneration"] = 9] = "WorkflowGeneration"
    Table[Table["WorkflowVersion"] = 10] = "WorkflowVersion"
    Table[Table["Achievement"] = 11] = "Achievement"
})(Table || (Table = {}));
export class DeletedRow {
    /** @param {{id?:number,table?:Table,key?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {Table} */
    table;
    /** @type {string} */
    key;
}
export class MyAchievement {
    /** @param {{id?:number,type?:AchievementType,title?:string,generationId?:string,artifactId?:number,refId?:string,refUserName?:string,score?:number,created?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {AchievementType} */
    type;
    /** @type {?string} */
    title;
    /** @type {?string} */
    generationId;
    /** @type {?number} */
    artifactId;
    /** @type {?string} */
    refId;
    /** @type {?string} */
    refUserName;
    /** @type {number} */
    score;
    /** @type {number} */
    created;
}
/** @typedef {number} */
export var NotificationType;
(function (NotificationType) {
    NotificationType[NotificationType["Unknown"] = 0] = "Unknown"
    NotificationType[NotificationType["NewComment"] = 1] = "NewComment"
    NotificationType[NotificationType["CommentMention"] = 2] = "CommentMention"
    NotificationType[NotificationType["NewBadge"] = 3] = "NewBadge"
})(NotificationType || (NotificationType = {}));
export class MyNotification {
    /** @param {{id?:number,type?:NotificationType,generationId?:string,artifactId?:number,refId?:string,summary?:string,created?:number,href?:string,title?:string,refUserName?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {NotificationType} */
    type;
    /** @type {?string} */
    generationId;
    /** @type {?number} */
    artifactId;
    /** @type {string} */
    refId;
    /** @type {string} */
    summary;
    /** @type {number} */
    created;
    /** @type {?string} */
    href;
    /** @type {?string} */
    title;
    /** @type {?string} */
    refUserName;
}
export class MyCreditLog {
    /** @param {{credits?:number,reason?:CreditReason,description?:string,refId?:string,refUserName?:string,created?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    credits;
    /** @type {?CreditReason} */
    reason;
    /** @type {?string} */
    description;
    /** @type {?string} */
    refId;
    /** @type {?string} */
    refUserName;
    /** @type {number} */
    created;
}
/** @typedef {'Queued'|'Started'|'Executed'|'Completed'|'Failed'|'Cancelled'} */
export var BackgroundJobState;
(function (BackgroundJobState) {
    BackgroundJobState["Queued"] = "Queued"
    BackgroundJobState["Started"] = "Started"
    BackgroundJobState["Executed"] = "Executed"
    BackgroundJobState["Completed"] = "Completed"
    BackgroundJobState["Failed"] = "Failed"
    BackgroundJobState["Cancelled"] = "Cancelled"
})(BackgroundJobState || (BackgroundJobState = {}));
export class StringsResponse {
    /** @param {{results?:string[],meta?:{ [index:string]: string; },responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string[]} */
    results = [];
    /** @type {?{ [index:string]: string; }} */
    meta;
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class StringResponse {
    /** @param {{result?:string,meta?:{ [index:string]: string; },responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    result;
    /** @type {?{ [index:string]: string; }} */
    meta;
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class HardDeleteGenerationsResponse {
    /** @param {{effect?:string,results?:GenerationRef[],responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    effect;
    /** @type {GenerationRef[]} */
    results = [];
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class Artifact extends AuditBase {
    /** @param {{id?:number,generationId?:string,type?:AssetType,url?:string,length?:number,width?:number,height?:number,resolution?:number,versionId?:number,workflowId?:number,threadId?:number,credits?:number,rating?:Rating,ratings?:Ratings,tags?:{ [index:string]: number; },categories?:{ [index:string]: number; },reactions?:{ [index:string]: number; },reactionsCount?:number,phash?:string,color?:string,caption?:string,description?:string,audio?:AudioInfo,publishedBy?:string,publishedDate?:string,variantId?:number,variantName?:string,deviceId?:string,error?:ResponseStatus,userName?:string,userKarma?:number,createdDate?:string,createdBy?:string,modifiedDate?:string,modifiedBy?:string,deletedDate?:string,deletedBy?:string}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {string} */
    generationId;
    /** @type {AssetType} */
    type;
    /** @type {string} */
    url;
    /** @type {number} */
    length;
    /** @type {?number} */
    width;
    /** @type {?number} */
    height;
    /** @type {?number} */
    resolution;
    /** @type {?number} */
    versionId;
    /** @type {?number} */
    workflowId;
    /** @type {?number} */
    threadId;
    /** @type {?number} */
    credits;
    /** @type {?Rating} */
    rating;
    /** @type {?Ratings} */
    ratings;
    /** @type {?{ [index:string]: number; }} */
    tags;
    /** @type {?{ [index:string]: number; }} */
    categories;
    /** @type {{ [index:string]: number; }} */
    reactions = {};
    /** @type {number} */
    reactionsCount;
    /** @type {?string} */
    phash;
    /** @type {?string} */
    color;
    /** @type {?string} */
    caption;
    /** @type {?string} */
    description;
    /** @type {?AudioInfo} */
    audio;
    /** @type {?string} */
    publishedBy;
    /** @type {?string} */
    publishedDate;
    /** @type {?number} */
    variantId;
    /** @type {?string} */
    variantName;
    /** @type {?string} */
    deviceId;
    /** @type {?ResponseStatus} */
    error;
    /** @type {?string} */
    userName;
    /** @type {?number} */
    userKarma;
}
export class DeleteDuplicateArtifactsResponse {
    /** @param {{urlCounts?:{ [index:string]: number; },deletedArtifacts?:Artifact[],responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {{ [index:string]: number; }} */
    urlCounts = {};
    /** @type {Artifact[]} */
    deletedArtifacts = [];
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class CleanResponse {
    /** @param {{summary?:{ [index:string]: number; },emptyGenerations?:string[],missingGenerationFiles?:string[],missingDbArtifacts?:string[],multipleDbArtifacts?:{ [index:string]: number[]; },errors?:string[],actions?:string[],responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {{ [index:string]: number; }} */
    summary = {};
    /** @type {string[]} */
    emptyGenerations = [];
    /** @type {string[]} */
    missingGenerationFiles = [];
    /** @type {string[]} */
    missingDbArtifacts = [];
    /** @type {{ [index:string]: number[]; }} */
    multipleDbArtifacts = {};
    /** @type {string[]} */
    errors = [];
    /** @type {string[]} */
    actions = [];
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class CreateMissingArtifactTagsResponse {
    /** @param {{tagsCreated?:number,artifactTagsCreated?:number,responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    tagsCreated;
    /** @type {number} */
    artifactTagsCreated;
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class CreateMissingArtifactCategoriesResponse {
    /** @param {{categoriesCreated?:number,artifactCategoriesCreated?:number,responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    categoriesCreated;
    /** @type {number} */
    artifactCategoriesCreated;
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class GetAiChatResponse {
    /** @param {{result?:string,response?:OpenAiChatResponse,responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    result;
    /** @type {?OpenAiChatResponse} */
    response;
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class EmptyResponse {
    /** @param {{responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class GetComfyAgentEventsResponse {
    /** @param {{results?:AgentEvent[],responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {AgentEvent[]} */
    results = [];
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class RegisterComfyAgentResponse {
    /** @param {{id?:number,apiKey?:string,deviceId?:string,nodes?:string[],categories?:string[],requirePip?:string[],requireNodes?:string[],requireModels?:string[],settings?:ComfyAgentSettings,responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {string} */
    apiKey;
    /** @type {string} */
    deviceId;
    /** @type {string[]} */
    nodes = [];
    /** @type {string[]} */
    categories = [];
    /** @type {?string[]} */
    requirePip;
    /** @type {?string[]} */
    requireNodes;
    /** @type {?string[]} */
    requireModels;
    /** @type {ComfyAgentSettings} */
    settings;
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class OllamaGenerate {
    /** @param {{model?:string,prompt?:string,suffix?:string,images?:string[],format?:string,options?:OllamaGenerateOptions,system?:string,template?:string,stream?:boolean,raw?:boolean,keep_alive?:string,context?:number[]}} [init] */
    constructor(init) { Object.assign(this, init) }
    /**
     * @type {string}
     * @description ID of the model to use. See the model endpoint compatibility table for details on which models work with the Chat API */
    model;
    /**
     * @type {string}
     * @description The prompt to generate a response for */
    prompt;
    /**
     * @type {string}
     * @description The text after the model response */
    suffix;
    /**
     * @type {?string[]}
     * @description List of base64 images referenced in this request */
    images;
    /**
     * @type {?string}
     * @description The format to return a response in. Format can be `json` or a JSON schema */
    format;
    /**
     * @type {?OllamaGenerateOptions}
     * @description Additional model parameters */
    options;
    /**
     * @type {?string}
     * @description System message */
    system;
    /**
     * @type {?string}
     * @description The prompt template to use */
    template;
    /**
     * @type {?boolean}
     * @description If set, partial message deltas will be sent, like in ChatGPT. Tokens will be sent as data-only server-sent events as they become available, with the stream terminated by a `data: [DONE]` message */
    stream;
    /**
     * @type {?boolean}
     * @description If `true` no formatting will be applied to the prompt. You may choose to use the raw parameter if you are specifying a full templated prompt in your request to the API */
    raw;
    /**
     * @type {?string}
     * @description Controls how long the model will stay loaded into memory following the request (default: 5m) */
    keep_alive;
    /**
     * @type {?number[]}
     * @description The context parameter returned from a previous request to /generate, this can be used to keep a short conversational memory */
    context;
}
export class OpenAiChat {
    /** @param {{messages?:OpenAiMessage[],model?:string,frequency_penalty?:number,logit_bias?:{ [index:number]: number; },logprobs?:boolean,top_logprobs?:number,max_tokens?:number,n?:number,presence_penalty?:number,response_format?:OpenAiResponseFormat,seed?:number,stop?:string[],stream?:boolean,temperature?:number,top_p?:number,tools?:OpenAiTools[],user?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /**
     * @type {OpenAiMessage[]}
     * @description A list of messages comprising the conversation so far. */
    messages = [];
    /**
     * @type {string}
     * @description ID of the model to use. See the model endpoint compatibility table for details on which models work with the Chat API */
    model;
    /**
     * @type {?number}
     * @description Number between `-2.0` and `2.0`. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim. */
    frequency_penalty;
    /**
     * @type {?{ [index:number]: number; }}
     * @description Modify the likelihood of specified tokens appearing in the completion. */
    logit_bias;
    /**
     * @type {?boolean}
     * @description Whether to return log probabilities of the output tokens or not. If true, returns the log probabilities of each output token returned in the content of message. */
    logprobs;
    /**
     * @type {?number}
     * @description An integer between 0 and 20 specifying the number of most likely tokens to return at each token position, each with an associated log probability. logprobs must be set to true if this parameter is used. */
    top_logprobs;
    /**
     * @type {?number}
     * @description The maximum number of tokens that can be generated in the chat completion. */
    max_tokens;
    /**
     * @type {?number}
     * @description How many chat completion choices to generate for each input message. Note that you will be charged based on the number of generated tokens across all of the choices. Keep `n` as `1` to minimize costs. */
    n;
    /**
     * @type {?number}
     * @description Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics. */
    presence_penalty;
    /**
     * @type {?OpenAiResponseFormat}
     * @description An object specifying the format that the model must output. Compatible with GPT-4 Turbo and all GPT-3.5 Turbo models newer than `gpt-3.5-turbo-1106`. Setting Type to ResponseFormat.JsonObject enables JSON mode, which guarantees the message the model generates is valid JSON. */
    response_format;
    /**
     * @type {?number}
     * @description This feature is in Beta. If specified, our system will make a best effort to sample deterministically, such that repeated requests with the same seed and parameters should return the same result. Determinism is not guaranteed, and you should refer to the system_fingerprint response parameter to monitor changes in the backend. */
    seed;
    /**
     * @type {?string[]}
     * @description Up to 4 sequences where the API will stop generating further tokens. */
    stop;
    /**
     * @type {?boolean}
     * @description If set, partial message deltas will be sent, like in ChatGPT. Tokens will be sent as data-only server-sent events as they become available, with the stream terminated by a `data: [DONE]` message. */
    stream;
    /**
     * @type {?number}
     * @description What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. */
    temperature;
    /**
     * @type {?number}
     * @description An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered. */
    top_p;
    /**
     * @type {?OpenAiTools[]}
     * @description A list of tools the model may call. Currently, only functions are supported as a tool. Use this to provide a list of functions the model may generate JSON inputs for. A max of 128 functions are supported. */
    tools;
    /**
     * @type {?string}
     * @description A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse. */
    user;
}
export class AgentDataResponse {
    /** @param {{categories?:string[],responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string[]} */
    categories = [];
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class GetPopularCategoriesResponse {
    /** @param {{results?:CategoryStat[],responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {CategoryStat[]} */
    results = [];
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class IdResponse {
    /** @param {{id?:string,responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    id;
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class GetAppDataResponse {
    /** @param {{assetCount?:number,workflowCount?:number,agentEventCounts?:{ [index:string]: number; },agents?:AgentInfo[],queuedAiTasks?:AiTaskInfo[],defaultGatewayNodes?:string[],responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    assetCount;
    /** @type {number} */
    workflowCount;
    /** @type {{ [index:string]: number; }} */
    agentEventCounts = {};
    /** @type {AgentInfo[]} */
    agents = [];
    /** @type {AiTaskInfo[]} */
    queuedAiTasks = [];
    /** @type {string[]} */
    defaultGatewayNodes = [];
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class OwnerAgentInfo extends AgentInfo {
    /** @param {{deviceId?:string,userId?:string,userName?:string,lastIp?:string,status?:string,modelSettings?:{ [index:string]: ModelSettings; },settings?:ComfyAgentSettings,id?:number,shortId?:string,userId?:string,gpus?:GpuInfo[],nodes?:string[],models?:{ [index:string]: string[]; },languageModels?:string[],requirePip?:string[],requireNodes?:string[],requireModels?:string[],installedPip?:string[],installedNodes?:string[],installedModels?:string[],hiddenModels?:string[],enabled?:boolean,offlineDate?:string,createdDate?:string,modifiedDate?:string,lastUpdate?:string,queueCount?:number,devicePool?:string}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    /** @type {string} */
    userId;
    /** @type {?string} */
    userName;
    /** @type {?string} */
    lastIp;
    /** @type {?string} */
    status;
    /** @type {?{ [index:string]: ModelSettings; }} */
    modelSettings;
    /** @type {ComfyAgentSettings} */
    settings;
}
export class UpdateComfyAgentSettingsResponse {
    /** @param {{result?:OwnerAgentInfo,responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {OwnerAgentInfo} */
    result;
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class ComfyTasksResponse {
    /** @param {{results?:ComfyTask[],responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {ComfyTask[]} */
    results = [];
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class GetWorkflowVersionResponse {
    /** @param {{result?:WorkflowVersion,responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {WorkflowVersion} */
    result;
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class GetWorkflowInfoResponse {
    /** @param {{result?:WorkflowInfo,responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {WorkflowInfo} */
    result;
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class RequeueGenerationResponse {
    /** @param {{id?:string,responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    id;
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class QueueWorkflowResponse {
    /** @param {{id?:string,responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    id;
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class ApiPrompt {
    /** @param {{prompt?:{ [index:string]: ApiNode; },extra_data?:{ [index:string]: Object; },client_id?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {{ [index:string]: ApiNode; }} */
    prompt = {};
    /** @type {?{ [index:string]: Object; }} */
    extra_data;
    /** @type {?string} */
    client_id;
}
export class GetExecutedWorkflowResultsResponse {
    /** @param {{result?:WorkflowResult,responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {WorkflowResult} */
    result;
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class GetExecutedWorkflowsResultsResponse {
    /** @param {{results?:{ [index:string]: WorkflowResult; },errors?:{ [index:string]: ResponseStatus; },responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?{ [index:string]: WorkflowResult; }} */
    results;
    /** @type {?{ [index:string]: ResponseStatus; }} */
    errors;
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class GetWorkflowGenerationResponse {
    /** @param {{result?:WorkflowGeneration,artifacts?:Artifact[],responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {WorkflowGeneration} */
    result;
    /** @type {Artifact[]} */
    artifacts = [];
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class UpdateWorkflowVersionResponse {
    /** @param {{versionId?:number,updated?:number,nodes?:string[],assets?:string[],info?:WorkflowInfo,responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    versionId;
    /** @type {number} */
    updated;
    /** @type {string[]} */
    nodes = [];
    /** @type {string[]} */
    assets = [];
    /** @type {WorkflowInfo} */
    info;
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class ParsedWorkflow {
    /** @param {{baseModel?:string,version?:string,name?:string,category?:string,path?:string,nodes?:string[],assets?:string[],requiresAssets?:string[],requiresCustomNodes?:string[],requiresPipPackages?:string[],info?:WorkflowInfo,workflow?:{ [index:string]: Object; },apiPrompt?:{ [index:string]: ApiNode; }}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    baseModel;
    /** @type {string} */
    version;
    /** @type {string} */
    name;
    /** @type {string} */
    category;
    /** @type {string} */
    path;
    /** @type {string[]} */
    nodes = [];
    /** @type {string[]} */
    assets = [];
    /** @type {string[]} */
    requiresAssets = [];
    /** @type {string[]} */
    requiresCustomNodes = [];
    /** @type {string[]} */
    requiresPipPackages = [];
    /** @type {WorkflowInfo} */
    info;
    /** @type {{ [index:string]: Object; }} */
    workflow = {};
    /** @type {?{ [index:string]: ApiNode; }} */
    apiPrompt;
}
export class UploadNewWorkflowResponse {
    /** @param {{versionId?:number,nodes?:string[],assets?:string[],info?:WorkflowInfo,responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    versionId;
    /** @type {string[]} */
    nodes = [];
    /** @type {string[]} */
    assets = [];
    /** @type {WorkflowInfo} */
    info;
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class FindAssetsResponse {
    /** @param {{results?:{ [index:string]: string; },responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {{ [index:string]: string; }} */
    results = {};
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class FindCustomNodesResponse {
    /** @param {{results?:{ [index:string]: string; },responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {{ [index:string]: string; }} */
    results = {};
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class GetDeviceStatusResponse {
    /** @param {{deviceId?:string,modifiedDate?:string,requirePip?:string[],requireNodes?:string[],requireModels?:string[],installedPip?:string[],installedNodes?:string[],installedModels?:string[],nodes?:string[],models?:{ [index:string]: string[]; },languageModels?:string[],status?:string,logs?:string,error?:ResponseStatus,responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    /** @type {string} */
    modifiedDate;
    /** @type {?string[]} */
    requirePip;
    /** @type {?string[]} */
    requireNodes;
    /** @type {?string[]} */
    requireModels;
    /** @type {?string[]} */
    installedPip;
    /** @type {?string[]} */
    installedNodes;
    /** @type {?string[]} */
    installedModels;
    /** @type {string[]} */
    nodes = [];
    /** @type {{ [index:string]: string[]; }} */
    models = {};
    /** @type {?string[]} */
    languageModels;
    /** @type {?string} */
    status;
    /** @type {?string} */
    logs;
    /** @type {?ResponseStatus} */
    error;
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class DeleteFilesResponse {
    /** @param {{deleted?:string[],missing?:string[],failed?:string[],responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string[]} */
    deleted = [];
    /** @type {string[]} */
    missing = [];
    /** @type {string[]} */
    failed = [];
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class HelloResponse {
    /** @param {{result?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    result;
}
export class AdminDataResponse {
    /** @param {{pageStats?:PageStats[]}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {PageStats[]} */
    pageStats = [];
}
export class GetTagArtifactIdsResponse {
    /** @param {{total?:number,results?:number[],responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    total;
    /** @type {number[]} */
    results = [];
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class GetCategoryArtifactIdsResponse {
    /** @param {{total?:number,results?:number[],responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    total;
    /** @type {number[]} */
    results = [];
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class TestUpload {
    /** @param {{int?:number,nullableId?:number,long?:number,double?:number,string?:string,dateTime?:string,intArray?:number[],intList?:number[],stringArray?:string[],stringList?:string[],pocoArray?:Poco[],pocoList?:Poco[],nullableByteArray?:number[],nullableByteList?:number[],nullableDateTimeArray?:string[],nullableDateTimeList?:string[],pocoLookup?:{ [index:string]: Poco[]; },pocoLookupMap?:{ [index:string]: { [index:string]: Poco; }[]; },mapList?:{ [index:string]: string[]; }}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    int;
    /** @type {?number} */
    nullableId;
    /** @type {number} */
    long;
    /** @type {number} */
    double;
    /** @type {string} */
    string;
    /** @type {string} */
    dateTime;
    /** @type {number[]} */
    intArray = [];
    /** @type {number[]} */
    intList = [];
    /** @type {string[]} */
    stringArray = [];
    /** @type {string[]} */
    stringList = [];
    /** @type {Poco[]} */
    pocoArray = [];
    /** @type {Poco[]} */
    pocoList = [];
    /** @type {number[]} */
    nullableByteArray = [];
    /** @type {number[]} */
    nullableByteList = [];
    /** @type {string[]} */
    nullableDateTimeArray = [];
    /** @type {string[]} */
    nullableDateTimeList = [];
    /** @type {{ [index:string]: Poco[]; }} */
    pocoLookup = {};
    /** @type {{ [index:string]: { [index:string]: Poco; }[]; }} */
    pocoLookupMap = {};
    /** @type {?{ [index:string]: string[]; }} */
    mapList;
    getTypeName() { return 'TestUpload' }
    getMethod() { return 'POST' }
    createResponse() { return new TestUpload() }
}
export class GetThreadResponse {
    /** @param {{result?:Thread,responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {Thread} */
    result;
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class GetDeletedRowsResponse {
    /** @param {{lastId?:number,results?:DeletedRow[],responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    lastId;
    /** @type {DeletedRow[]} */
    results = [];
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class UserInfo {
    /** @param {{karma?:number,credits?:number,quotaTier?:QuotaTier,lastReadNotificationId?:number,lastReadAchievementId?:number,modified?:number,lastBonusDate?:string,claimBonusMessage?:string,timeTillNextBonus?:string,latestAchievements?:MyAchievement[],latestNotifications?:MyNotification[],latestCredits?:MyCreditLog[],hasUnreadAchievements?:boolean,hasUnreadNotifications?:boolean}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    karma;
    /** @type {number} */
    credits;
    /** @type {QuotaTier} */
    quotaTier;
    /** @type {number} */
    lastReadNotificationId;
    /** @type {number} */
    lastReadAchievementId;
    /** @type {number} */
    modified;
    /** @type {?string} */
    lastBonusDate;
    /** @type {?string} */
    claimBonusMessage;
    /** @type {string} */
    timeTillNextBonus;
    /** @type {MyAchievement[]} */
    latestAchievements = [];
    /** @type {MyNotification[]} */
    latestNotifications = [];
    /** @type {MyCreditLog[]} */
    latestCredits = [];
    /** @type {boolean} */
    hasUnreadAchievements;
    /** @type {boolean} */
    hasUnreadNotifications;
}
export class ClaimBonusCreditsResponse {
    /** @param {{creditsAwarded?:number,message?:string,responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    creditsAwarded;
    /** @type {?string} */
    message;
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class QueueOpenAiChatResponse {
    /** @param {{id?:number,refId?:string,statusUrl?:string,responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {string} */
    refId;
    /** @type {string} */
    statusUrl;
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class GetOpenAiChatStatusResponse {
    /** @param {{jobId?:number,refId?:string,jobState?:BackgroundJobState,status?:string,responseStatus?:ResponseStatus,result?:OpenAiChatResponse}} [init] */
    constructor(init) { Object.assign(this, init) }
    /**
     * @type {number}
     * @description Unique identifier of the background job */
    jobId;
    /**
     * @type {string}
     * @description Client-provided identifier for the request */
    refId;
    /**
     * @type {BackgroundJobState}
     * @description Current state of the background job */
    jobState;
    /**
     * @type {?string}
     * @description Current status of the generation request */
    status;
    /**
     * @type {?ResponseStatus}
     * @description Detailed response status information */
    responseStatus;
    /**
     * @type {?OpenAiChatResponse}
     * @description Chat result */
    result;
}
export class GetAiTasksResponse {
    /** @param {{results?:AgentEvent[],responseStatus?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {AgentEvent[]} */
    results = [];
    /** @type {?ResponseStatus} */
    responseStatus;
}
export class AuthenticateResponse {
    /** @param {{userId?:string,sessionId?:string,userName?:string,displayName?:string,referrerUrl?:string,bearerToken?:string,refreshToken?:string,refreshTokenExpiry?:string,profileUrl?:string,roles?:string[],permissions?:string[],authProvider?:string,responseStatus?:ResponseStatus,meta?:{ [index:string]: string; }}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    userId;
    /** @type {string} */
    sessionId;
    /** @type {string} */
    userName;
    /** @type {string} */
    displayName;
    /** @type {string} */
    referrerUrl;
    /** @type {string} */
    bearerToken;
    /** @type {string} */
    refreshToken;
    /** @type {?string} */
    refreshTokenExpiry;
    /** @type {string} */
    profileUrl;
    /** @type {string[]} */
    roles;
    /** @type {string[]} */
    permissions;
    /** @type {string} */
    authProvider;
    /** @type {ResponseStatus} */
    responseStatus;
    /** @type {{ [index:string]: string; }} */
    meta;
}
export class FixGenerations {
    /** @param {{take?:number,type?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?number} */
    take;
    /** @type {?string} */
    type;
    getTypeName() { return 'FixGenerations' }
    getMethod() { return 'POST' }
    createResponse() { return new StringsResponse() }
}
export class UpdateAudioTags {
    /** @param {{artifactPath?:string,artifactTags?:{ [index:string]: number; }}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    artifactPath;
    /** @type {{ [index:string]: number; }} */
    artifactTags = {};
    getTypeName() { return 'UpdateAudioTags' }
    getMethod() { return 'POST' }
    createResponse() { return new StringsResponse() }
}
export class HardDeleteWorkflow {
    /** @param {{id?:number,force?:boolean}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {boolean} */
    force;
    getTypeName() { return 'HardDeleteWorkflow' }
    getMethod() { return 'DELETE' }
    createResponse() { return new StringResponse() }
}
export class HardDeleteGenerations {
    /** @param {{limit?:number,delete?:boolean}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    limit;
    /** @type {boolean} */
    delete;
    getTypeName() { return 'HardDeleteGenerations' }
    getMethod() { return 'POST' }
    createResponse() { return new HardDeleteGenerationsResponse() }
}
export class HardDeleteWorkflowGeneration {
    /** @param {{id?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    id;
    getTypeName() { return 'HardDeleteWorkflowGeneration' }
    getMethod() { return 'DELETE' }
    createResponse() { return new StringResponse() }
}
export class HardDeleteArtifact {
    /** @param {{artifactId?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    artifactId;
    getTypeName() { return 'HardDeleteArtifact' }
    getMethod() { return 'POST' }
    createResponse() { return new StringsResponse() }
}
export class DeleteMissingArtifacts {
    /** @param {{delete?:boolean}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {boolean} */
    delete;
    getTypeName() { return 'DeleteMissingArtifacts' }
    getMethod() { return 'POST' }
    createResponse() { return new StringsResponse() }
}
export class DeleteDuplicateArtifacts {
    /** @param {{delete?:boolean}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {boolean} */
    delete;
    getTypeName() { return 'DeleteDuplicateArtifacts' }
    getMethod() { return 'POST' }
    createResponse() { return new DeleteDuplicateArtifactsResponse() }
}
export class PopulateMissingArtifacts {
    /** @param {{populate?:boolean}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {boolean} */
    populate;
    getTypeName() { return 'PopulateMissingArtifacts' }
    getMethod() { return 'POST' }
    createResponse() { return new StringsResponse() }
}
export class RegenerateGenerationResults {
    /** @param {{regenerate?:boolean}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {boolean} */
    regenerate;
    getTypeName() { return 'RegenerateGenerationResults' }
    getMethod() { return 'POST' }
    createResponse() { return new StringResponse() }
}
export class RequeueFailedThreadGenerations {
    /** @param {{threadId?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    threadId;
    getTypeName() { return 'RequeueFailedThreadGenerations' }
    getMethod() { return 'POST' }
    createResponse() { return new StringResponse() }
}
export class Clean {
    /** @param {{force?:boolean}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {boolean} */
    force;
    getTypeName() { return 'Clean' }
    getMethod() { return 'POST' }
    createResponse() { return new CleanResponse() }
}
export class RecreateArtifactCategories {
    constructor(init) { Object.assign(this, init) }
    getTypeName() { return 'RecreateArtifactCategories' }
    getMethod() { return 'POST' }
    createResponse() { return new StringResponse() }
}
export class RecreateArtifactTags {
    constructor(init) { Object.assign(this, init) }
    getTypeName() { return 'RecreateArtifactTags' }
    getMethod() { return 'POST' }
    createResponse() { return new StringResponse() }
}
export class CreateMissingArtifactTags {
    constructor(init) { Object.assign(this, init) }
    getTypeName() { return 'CreateMissingArtifactTags' }
    getMethod() { return 'POST' }
    createResponse() { return new CreateMissingArtifactTagsResponse() }
}
export class CreateMissingArtifactCategories {
    constructor(init) { Object.assign(this, init) }
    getTypeName() { return 'CreateMissingArtifactCategories' }
    getMethod() { return 'POST' }
    createResponse() { return new CreateMissingArtifactCategoriesResponse() }
}
export class SendCaptionArtifactEvent {
    /** @param {{artifactIds?:number[],model?:string,take?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?number[]} */
    artifactIds;
    /** @type {?string} */
    model;
    /** @type {?number} */
    take;
    getTypeName() { return 'SendCaptionArtifactEvent' }
    getMethod() { return 'POST' }
    createResponse() { return new StringsResponse() }
}
export class ReloadAgentEvents {
    constructor(init) { Object.assign(this, init) }
    getTypeName() { return 'ReloadAgentEvents' }
    getMethod() { return 'POST' }
    createResponse() { return new StringResponse() }
}
export class GenerateCaptionArtifact {
    /** @param {{artifactIds?:number[],model?:string,take?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?number[]} */
    artifactIds;
    /** @type {?string} */
    model;
    /** @type {?number} */
    take;
    getTypeName() { return 'GenerateCaptionArtifact' }
    getMethod() { return 'POST' }
    createResponse() { return new StringsResponse() }
}
export class CreateMissingAvatars {
    constructor(init) { Object.assign(this, init) }
    getTypeName() { return 'CreateMissingAvatars' }
    getMethod() { return 'POST' }
    createResponse() { return new StringsResponse() }
}
export class MigrateToPostgres {
    constructor(init) { Object.assign(this, init) }
    getTypeName() { return 'MigrateToPostgres' }
    getMethod() { return 'GET' }
    createResponse() { return new StringResponse() }
}
export class AiChat {
    /** @param {{model?:string,prompt?:string,systemPrompt?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?string} */
    model;
    /** @type {string} */
    prompt;
    /** @type {?string} */
    systemPrompt;
    getTypeName() { return 'AiChat' }
    getMethod() { return 'POST' }
    createResponse() { return new StringResponse() }
}
export class GetAiChat {
    /** @param {{taskId?:number,includeDetails?:boolean}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?number} */
    taskId;
    /** @type {?boolean} */
    includeDetails;
    getTypeName() { return 'GetAiChat' }
    getMethod() { return 'GET' }
    createResponse() { return new GetAiChatResponse() }
}
export class ResizeImages {
    /** @param {{id?:string,width?:number,height?:number,limit?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?string} */
    id;
    /** @type {?number} */
    width;
    /** @type {?number} */
    height;
    /** @type {?number} */
    limit;
    getTypeName() { return 'ResizeImages' }
    getMethod() { return 'POST' }
    createResponse() { return new StringsResponse() }
}
export class UpdateComfyAgent {
    /** @param {{deviceId?:string,queueCount?:number,status?:string,error?:ResponseStatus,gpus?:GpuInfo[],models?:{ [index:string]: string[]; },languageModels?:string[],installedPip?:string[],installedNodes?:string[],installedModels?:string[],runningGenerationIds?:string[],queuedGenerationIds?:string[]}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    /** @type {number} */
    queueCount;
    /** @type {?string} */
    status;
    /** @type {?ResponseStatus} */
    error;
    /** @type {?GpuInfo[]} */
    gpus;
    /** @type {?{ [index:string]: string[]; }} */
    models;
    /** @type {?string[]} */
    languageModels;
    /** @type {?string[]} */
    installedPip;
    /** @type {?string[]} */
    installedNodes;
    /** @type {?string[]} */
    installedModels;
    /** @type {?string[]} */
    runningGenerationIds;
    /** @type {?string[]} */
    queuedGenerationIds;
    getTypeName() { return 'UpdateComfyAgent' }
    getMethod() { return 'POST' }
    createResponse() { return new EmptyResponse() }
}
export class UpdateComfyAgentStatus {
    /** @param {{deviceId?:string,status?:string,logs?:string,error?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    /** @type {?string} */
    status;
    /** @type {?string} */
    logs;
    /** @type {?ResponseStatus} */
    error;
    getTypeName() { return 'UpdateComfyAgentStatus' }
    getMethod() { return 'POST' }
    createResponse() { return new EmptyResponse() }
}
export class GetComfyAgentEvents {
    /** @param {{deviceId?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    getTypeName() { return 'GetComfyAgentEvents' }
    getMethod() { return 'GET' }
    createResponse() { return new GetComfyAgentEventsResponse() }
}
export class TestGenerations {
    /** @param {{deviceId?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    getTypeName() { return 'TestGenerations' }
    getMethod() { return 'GET' }
    createResponse() { return [] }
}
export class RegisterComfyAgent {
    /** @param {{deviceId?:string,version?:number,comfyVersion?:string,workflows?:string[],queueCount?:number,gpus?:GpuInfo[],models?:{ [index:string]: string[]; },languageModels?:string[],installedPip?:string[],installedNodes?:string[],installedModels?:string[],config?:ComfyAgentConfig}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    /** @type {number} */
    version;
    /** @type {string} */
    comfyVersion;
    /** @type {string[]} */
    workflows = [];
    /** @type {number} */
    queueCount;
    /** @type {?GpuInfo[]} */
    gpus;
    /** @type {?{ [index:string]: string[]; }} */
    models;
    /** @type {?string[]} */
    languageModels;
    /** @type {?string[]} */
    installedPip;
    /** @type {?string[]} */
    installedNodes;
    /** @type {?string[]} */
    installedModels;
    /** @type {ComfyAgentConfig} */
    config;
    getTypeName() { return 'RegisterComfyAgent' }
    getMethod() { return 'POST' }
    createResponse() { return new RegisterComfyAgentResponse() }
}
export class UnRegisterComfyAgent {
    /** @param {{deviceId?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    getTypeName() { return 'UnRegisterComfyAgent' }
    getMethod() { return 'POST' }
    createResponse() { return new EmptyResponse() }
}
export class UpdateWorkflowGeneration {
    /** @param {{id?:string,deviceId?:string,promptId?:string,status?:string,outputs?:string,queueCount?:number,error?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    id;
    /** @type {string} */
    deviceId;
    /** @type {?string} */
    promptId;
    /** @type {?string} */
    status;
    /** @type {?string} */
    outputs;
    /** @type {?number} */
    queueCount;
    /** @type {?ResponseStatus} */
    error;
    getTypeName() { return 'UpdateWorkflowGeneration' }
    getMethod() { return 'POST' }
    createResponse() { return new EmptyResponse() }
}
export class CaptionArtifact {
    /** @param {{deviceId?:string,artifactUrl?:string,caption?:string,description?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    /** @type {string} */
    artifactUrl;
    /** @type {?string} */
    caption;
    /** @type {?string} */
    description;
    getTypeName() { return 'CaptionArtifact' }
    getMethod() { return 'POST' }
    createResponse() { return new EmptyResponse() }
}
export class GetOllamaGenerateTask {
    /** @param {{taskId?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    taskId;
    getTypeName() { return 'GetOllamaGenerateTask' }
    getMethod() { return 'GET' }
    createResponse() { return new OllamaGenerate() }
}
export class CompleteOllamaGenerateTask extends OllamaGenerateResponse {
    /** @param {{taskId?:number,model?:string,created_at?:number,response?:string,done?:boolean,done_reason?:string,total_duration?:number,load_duration?:number,prompt_eval_count?:number,prompt_eval_duration?:number,eval_count?:number,prompt_tokens?:number,context?:number[],responseStatus?:ResponseStatus}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {number} */
    taskId;
    getTypeName() { return 'CompleteOllamaGenerateTask' }
    getMethod() { return 'POST' }
    createResponse() { return new EmptyResponse() }
}
export class GetOpenAiChatTask {
    /** @param {{taskId?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    taskId;
    getTypeName() { return 'GetOpenAiChatTask' }
    getMethod() { return 'GET' }
    createResponse() { return new OpenAiChat() }
}
export class CompleteOpenAiChatTask extends OpenAiChatResponse {
    /** @param {{refId?:string,id?:string,choices?:Choice[],created?:number,model?:string,system_fingerprint?:string,object?:string,usage?:OpenAiUsage,responseStatus?:ResponseStatus}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {string} */
    refId;
    getTypeName() { return 'CompleteOpenAiChatTask' }
    getMethod() { return 'POST' }
    createResponse() { return new EmptyResponse() }
}
export class AgentData {
    /** @param {{deviceId?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    getTypeName() { return 'AgentData' }
    getMethod() { return 'GET' }
    createResponse() { return new AgentDataResponse() }
}
export class GetArtifactClassificationTasks {
    /** @param {{deviceId?:string,types?:AssetType[],take?:number,waitFor?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    /** @type {AssetType[]} */
    types = [];
    /** @type {?number} */
    take;
    /** @type {?number} */
    waitFor;
    getTypeName() { return 'GetArtifactClassificationTasks' }
    getMethod() { return 'GET' }
    createResponse() { return new QueryResponse() }
}
export class CompleteArtifactClassificationTask {
    /** @param {{deviceId?:string,artifactId?:number,tags?:{ [index:string]: number; },categories?:{ [index:string]: number; },objects?:ObjectDetection[],ratings?:Ratings,phash?:string,color?:string,error?:ResponseStatus}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    /** @type {number} */
    artifactId;
    /** @type {?{ [index:string]: number; }} */
    tags;
    /** @type {?{ [index:string]: number; }} */
    categories;
    /** @type {?ObjectDetection[]} */
    objects;
    /** @type {?Ratings} */
    ratings;
    /** @type {?string} */
    phash;
    /** @type {?string} */
    color;
    /** @type {?ResponseStatus} */
    error;
    getTypeName() { return 'CompleteArtifactClassificationTask' }
    getMethod() { return 'POST' }
    createResponse() { return new EmptyResponse() }
}
export class GetPopularCategories {
    /** @param {{type?:AssetType,take?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {AssetType} */
    type;
    /** @type {?number} */
    take;
    getTypeName() { return 'GetPopularCategories' }
    getMethod() { return 'GET' }
    createResponse() { return new GetPopularCategoriesResponse() }
}
export class QueryArtifacts extends QueryDb_1 {
    /** @param {{id?:number,search?:string,rating?:Rating,ratings?:Rating[],category?:string,tag?:string,versionId?:number,similar?:number,type?:AssetType,userId?:string,user?:string,skip?:number,take?:number,orderBy?:string,orderByDesc?:string,include?:string,fields?:string,meta?:{ [index:string]: string; }}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {?number} */
    id;
    /** @type {?string} */
    search;
    /** @type {?Rating} */
    rating;
    /** @type {?Rating[]} */
    ratings;
    /** @type {?string} */
    category;
    /** @type {?string} */
    tag;
    /** @type {?number} */
    versionId;
    /** @type {?number} */
    similar;
    /** @type {?AssetType} */
    type;
    /** @type {?string} */
    userId;
    /** @type {?string} */
    user;
    getTypeName() { return 'QueryArtifacts' }
    getMethod() { return 'GET' }
    createResponse() { return new QueryResponse() }
}
export class GetArtifactVariants {
    /** @param {{generationId?:string,artifactIds?:number[]}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?string} */
    generationId;
    /** @type {?number[]} */
    artifactIds;
    getTypeName() { return 'GetArtifactVariants' }
    getMethod() { return 'GET' }
    createResponse() { return new QueryResponse() }
}
export class PublishGeneration {
    /** @param {{id?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    id;
    getTypeName() { return 'PublishGeneration' }
    getMethod() { return 'POST' }
    createResponse() { return new EmptyResponse() }
}
export class CreateArtifactReaction {
    /** @param {{artifactId?:number,reaction?:Reaction}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    artifactId;
    /** @type {Reaction} */
    reaction;
    getTypeName() { return 'CreateArtifactReaction' }
    getMethod() { return 'POST' }
    createResponse() { return new ArtifactReaction() }
}
export class DeleteArtifactReaction {
    /** @param {{artifactId?:number,reaction?:Reaction}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    artifactId;
    /** @type {Reaction} */
    reaction;
    getTypeName() { return 'DeleteArtifactReaction' }
    getMethod() { return 'DELETE' }
    createResponse() { return new IdResponse() }
}
export class ModerateArtifact {
    /** @param {{id?:number,rating?:Rating,tag?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {?Rating} */
    rating;
    /** @type {?string} */
    tag;
    getTypeName() { return 'ModerateArtifact' }
    getMethod() { return 'POST' }
    createResponse() { return new EmptyResponse() }
}
export class SubmitArtifactModeration {
    /** @param {{artifactId?:number,hideArtifact?:boolean,rating?:Rating,poorQuality?:number,reportType?:ReportType,reportTag?:ReportTag,reportComment?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    artifactId;
    /** @type {?boolean} */
    hideArtifact;
    /** @type {?Rating} */
    rating;
    /** @type {?number} */
    poorQuality;
    /** @type {?ReportType} */
    reportType;
    /** @type {?ReportTag} */
    reportTag;
    /** @type {?string} */
    reportComment;
    getTypeName() { return 'SubmitArtifactModeration' }
    getMethod() { return 'POST' }
    createResponse() { return new Artifact() }
}
export class GetAppData {
    constructor(init) { Object.assign(this, init) }
    getTypeName() { return 'GetAppData' }
    getMethod() { return 'GET' }
    createResponse() { return new GetAppDataResponse() }
}
export class UpdateDevice {
    /** @param {{deviceId?:string,addModelSettings?:{ [index:string]: ModelSettings; }}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    /** @type {?{ [index:string]: ModelSettings; }} */
    addModelSettings;
    getTypeName() { return 'UpdateDevice' }
    getMethod() { return 'POST' }
    createResponse() { return new OwnerAgentInfo() }
}
export class UpdateComfyAgentSettings {
    /** @param {{deviceId?:string,inDevicePool?:boolean,preserveOutputs?:boolean,maxBatchSize?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    /** @type {?boolean} */
    inDevicePool;
    /** @type {?boolean} */
    preserveOutputs;
    /** @type {?number} */
    maxBatchSize;
    getTypeName() { return 'UpdateComfyAgentSettings' }
    getMethod() { return 'PATCH' }
    createResponse() { return new UpdateComfyAgentSettingsResponse() }
}
export class DevicePool {
    /** @param {{afterModifiedDate?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?string} */
    afterModifiedDate;
    getTypeName() { return 'DevicePool' }
    getMethod() { return 'GET' }
    createResponse() { return new QueryResponse() }
}
export class MyDevices {
    /** @param {{afterModifiedDate?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?string} */
    afterModifiedDate;
    getTypeName() { return 'MyDevices' }
    getMethod() { return 'GET' }
    createResponse() { return new QueryResponse() }
}
export class RemoveDevice {
    /** @param {{id?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    getTypeName() { return 'RemoveDevice' }
    getMethod() { return 'POST' }
    createResponse() { return new EmptyResponse() }
}
export class GetComfyTasks {
    /** @param {{deviceId?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    getTypeName() { return 'GetComfyTasks' }
    getMethod() { return 'GET' }
    createResponse() { return new ComfyTasksResponse() }
}
export class GetWorkflowPaths {
    constructor(init) { Object.assign(this, init) }
    getTypeName() { return 'GetWorkflowPaths' }
    getMethod() { return 'GET' }
    createResponse() { return [] }
}
export class GetWorkflowVersion {
    /** @param {{versionId?:number,workflowId?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?number} */
    versionId;
    /** @type {?number} */
    workflowId;
    getTypeName() { return 'GetWorkflowVersion' }
    getMethod() { return 'GET' }
    createResponse() { return new GetWorkflowVersionResponse() }
}
export class GetWorkflowInfo {
    /** @param {{versionId?:number,workflowId?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?number} */
    versionId;
    /** @type {?number} */
    workflowId;
    getTypeName() { return 'GetWorkflowInfo' }
    getMethod() { return 'GET' }
    createResponse() { return new GetWorkflowInfoResponse() }
}
export class DownloadWorkflowVersion {
    /** @param {{id?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    getTypeName() { return 'DownloadWorkflowVersion' }
    getMethod() { return 'GET' }
    createResponse() { return new Blob() }
}
export class RequeueGeneration {
    /** @param {{id?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    id;
    getTypeName() { return 'RequeueGeneration' }
    getMethod() { return 'POST' }
    createResponse() { return new RequeueGenerationResponse() }
}
export class QueueWorkflow {
    /** @param {{workflowId?:number,versionId?:number,threadId?:number,description?:string,deviceId?:string,args?:{ [index:string]: Object; }}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    workflowId;
    /** @type {?number} */
    versionId;
    /** @type {?number} */
    threadId;
    /** @type {?string} */
    description;
    /** @type {?string} */
    deviceId;
    /** @type {?{ [index:string]: Object; }} */
    args;
    getTypeName() { return 'QueueWorkflow' }
    getMethod() { return 'POST' }
    createResponse() { return new QueueWorkflowResponse() }
}
export class GetGenerationApiPrompt {
    /** @param {{id?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    id;
    getTypeName() { return 'GetGenerationApiPrompt' }
    getMethod() { return 'GET' }
    createResponse() { return new ApiPrompt() }
}
export class GetExecutedWorkflowResults {
    /** @param {{id?:string,poll?:boolean}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    id;
    /** @type {?boolean} */
    poll;
    getTypeName() { return 'GetExecutedWorkflowResults' }
    getMethod() { return 'GET' }
    createResponse() { return new GetExecutedWorkflowResultsResponse() }
}
export class GetExecutedWorkflowsResults {
    /** @param {{ids?:string[],poll?:boolean}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string[]} */
    ids = [];
    /** @type {?boolean} */
    poll;
    getTypeName() { return 'GetExecutedWorkflowsResults' }
    getMethod() { return 'GET' }
    createResponse() { return new GetExecutedWorkflowsResultsResponse() }
}
export class WaitForMyWorkflowGenerations {
    /** @param {{ids?:string[],threadId?:number,afterModifiedDate?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string[]} */
    ids = [];
    /** @type {?number} */
    threadId;
    /** @type {?string} */
    afterModifiedDate;
    getTypeName() { return 'WaitForMyWorkflowGenerations' }
    getMethod() { return 'GET' }
    createResponse() { return new QueryResponse() }
}
export class UpdateGenerationAsset {
    /** @param {{generationId?:string,assetUrl?:string,rating?:Rating}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    generationId;
    /** @type {string} */
    assetUrl;
    /** @type {?Rating} */
    rating;
    getTypeName() { return 'UpdateGenerationAsset' }
    getMethod() { return 'POST' }
    createResponse() { return new EmptyResponse() }
}
export class DeleteWorkflowGenerationArtifact {
    /** @param {{generationId?:string,assetUrl?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    generationId;
    /** @type {string} */
    assetUrl;
    getTypeName() { return 'DeleteWorkflowGenerationArtifact' }
    getMethod() { return 'DELETE' }
    createResponse() { return new WorkflowGeneration() }
}
export class PinWorkflowGenerationArtifact {
    /** @param {{generationId?:string,assetUrl?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    generationId;
    /** @type {string} */
    assetUrl;
    getTypeName() { return 'PinWorkflowGenerationArtifact' }
    getMethod() { return 'POST' }
    createResponse() { return new EmptyResponse() }
}
export class PublishWorkflowGeneration {
    /** @param {{id?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    id;
    getTypeName() { return 'PublishWorkflowGeneration' }
    getMethod() { return 'POST' }
    createResponse() { return new EmptyResponse() }
}
export class GetWorkflowGeneration {
    /** @param {{id?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    id;
    getTypeName() { return 'GetWorkflowGeneration' }
    getMethod() { return 'GET' }
    createResponse() { return new GetWorkflowGenerationResponse() }
}
export class MoveGeneration {
    /** @param {{generationId?:string,threadId?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    generationId;
    /** @type {number} */
    threadId;
    getTypeName() { return 'MoveGeneration' }
    getMethod() { return 'POST' }
    createResponse() { return new EmptyResponse() }
}
export class PinToWorkflowVersion {
    /** @param {{versionId?:number,posterImage?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    versionId;
    /** @type {string} */
    posterImage;
    getTypeName() { return 'PinToWorkflowVersion' }
    getMethod() { return 'POST' }
    createResponse() { return new EmptyResponse() }
}
export class FeatureArtifact {
    /** @param {{artifactId?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    artifactId;
    getTypeName() { return 'FeatureArtifact' }
    getMethod() { return 'POST' }
    createResponse() { return new Artifact() }
}
export class UnFeatureArtifact {
    /** @param {{artifactId?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    artifactId;
    getTypeName() { return 'UnFeatureArtifact' }
    getMethod() { return 'POST' }
    createResponse() { return new Artifact() }
}
export class UpdateWorkflowVersion {
    /** @param {{versionId?:number,workflow?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    versionId;
    /** @type {?string} */
    workflow;
    getTypeName() { return 'UpdateWorkflowVersion' }
    getMethod() { return 'POST' }
    createResponse() { return new UpdateWorkflowVersionResponse() }
}
export class ParseWorkflowVersions {
    /** @param {{versionId?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?number} */
    versionId;
    getTypeName() { return 'ParseWorkflowVersions' }
    getMethod() { return 'POST' }
    createResponse() { return new StringsResponse() }
}
export class ParseWorkflow {
    /** @param {{name?:string,json?:string,file?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?string} */
    name;
    /** @type {?string} */
    json;
    /** @type {?string} */
    file;
    getTypeName() { return 'ParseWorkflow' }
    getMethod() { return 'POST' }
    createResponse() { return new ParsedWorkflow() }
}
export class UploadNewWorkflow {
    /** @param {{workflowName?:string,baseModel?:BaseModel,workflow?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?string} */
    workflowName;
    /** @type {BaseModel} */
    baseModel;
    /** @type {?string} */
    workflow;
    getTypeName() { return 'UploadNewWorkflow' }
    getMethod() { return 'POST' }
    createResponse() { return new UploadNewWorkflowResponse() }
}
export class FindAssets {
    /** @param {{assets?:string[]}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string[]} */
    assets = [];
    getTypeName() { return 'FindAssets' }
    getMethod() { return 'GET' }
    createResponse() { return new FindAssetsResponse() }
}
export class FindCustomNodes {
    /** @param {{types?:string[]}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string[]} */
    types = [];
    getTypeName() { return 'FindCustomNodes' }
    getMethod() { return 'GET' }
    createResponse() { return new FindCustomNodesResponse() }
}
export class InstallPipPackage {
    /** @param {{deviceId?:string,package?:string,require?:boolean}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    /** @type {string} */
    package;
    /** @type {?boolean} */
    require;
    getTypeName() { return 'InstallPipPackage' }
    getMethod() { return 'POST' }
    createResponse() { return new StringResponse() }
}
export class UninstallPipPackage {
    /** @param {{deviceId?:string,package?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    /** @type {string} */
    package;
    getTypeName() { return 'UninstallPipPackage' }
    getMethod() { return 'POST' }
    createResponse() { return new StringResponse() }
}
export class InstallCustomNode {
    /** @param {{deviceId?:string,url?:string,require?:boolean}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    /** @type {string} */
    url;
    /** @type {?boolean} */
    require;
    getTypeName() { return 'InstallCustomNode' }
    getMethod() { return 'POST' }
    createResponse() { return new StringResponse() }
}
export class UninstallCustomNode {
    /** @param {{deviceId?:string,url?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    /** @type {string} */
    url;
    getTypeName() { return 'UninstallCustomNode' }
    getMethod() { return 'POST' }
    createResponse() { return new StringResponse() }
}
export class InstallAsset {
    /** @param {{deviceId?:string,assetId?:number,require?:boolean}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    /** @type {number} */
    assetId;
    /** @type {?boolean} */
    require;
    getTypeName() { return 'InstallAsset' }
    getMethod() { return 'POST' }
    createResponse() { return new StringResponse() }
}
export class InstallModel {
    /** @param {{deviceId?:string,url?:string,saveTo?:string,fileName?:string,token?:string,require?:boolean}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    /** @type {string} */
    url;
    /** @type {string} */
    saveTo;
    /** @type {string} */
    fileName;
    /** @type {?string} */
    token;
    /** @type {?boolean} */
    require;
    getTypeName() { return 'InstallModel' }
    getMethod() { return 'POST' }
    createResponse() { return new StringResponse() }
}
export class DeleteModel {
    /** @param {{deviceId?:string,path?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    /** @type {string} */
    path;
    getTypeName() { return 'DeleteModel' }
    getMethod() { return 'POST' }
    createResponse() { return new StringResponse() }
}
export class RebootAgent {
    /** @param {{deviceId?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    getTypeName() { return 'RebootAgent' }
    getMethod() { return 'POST' }
    createResponse() { return new StringResponse() }
}
export class AgentCommand {
    /** @param {{deviceId?:string,command?:AgentCommands,args?:{ [index:string]: string; }}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    /** @type {AgentCommands} */
    command;
    /** @type {?{ [index:string]: string; }} */
    args;
    getTypeName() { return 'AgentCommand' }
    getMethod() { return 'POST' }
    createResponse() { return new StringResponse() }
}
export class GetDeviceStatus {
    /** @param {{deviceId?:string,poll?:boolean,statusChanged?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    /** @type {?boolean} */
    poll;
    /** @type {?string} */
    statusChanged;
    getTypeName() { return 'GetDeviceStatus' }
    getMethod() { return 'GET' }
    createResponse() { return new GetDeviceStatusResponse() }
}
export class GetDeviceObjectInfo {
    /** @param {{deviceId?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    getTypeName() { return 'GetDeviceObjectInfo' }
    getMethod() { return 'GET' }
    createResponse() { return '' }
}
export class GetDeviceStats {
    /** @param {{id?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    getTypeName() { return 'GetDeviceStats' }
    getMethod() { return 'GET' }
    createResponse() { return new QueryResponse() }
}
export class DownloadFile {
    /** @param {{path?:string,download?:boolean}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    path;
    /** @type {?boolean} */
    download;
    getTypeName() { return 'DownloadFile' }
    getMethod() { return 'GET' }
    createResponse() { return new Blob() }
}
export class GetUserAvatar {
    /** @param {{userName?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    userName;
    getTypeName() { return 'GetUserAvatar' }
    getMethod() { return 'GET' }
    createResponse() { return new Blob() }
}
export class GetAvatarFile {
    /** @param {{path?:string,download?:boolean}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    path;
    /** @type {?boolean} */
    download;
    getTypeName() { return 'GetAvatarFile' }
    getMethod() { return 'GET' }
    createResponse() { return new Blob() }
}
export class GetArtifact {
    /** @param {{path?:string,download?:boolean}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    path;
    /** @type {?boolean} */
    download;
    getTypeName() { return 'GetArtifact' }
    getMethod() { return 'GET' }
    createResponse() { return new Blob() }
}
export class DeleteFile {
    /** @param {{path?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    path;
    getTypeName() { return 'DeleteFile' }
    getMethod() { return 'DELETE' }
    createResponse() { return new EmptyResponse() }
}
export class DeleteFiles {
    /** @param {{paths?:string[]}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string[]} */
    paths = [];
    getTypeName() { return 'DeleteFiles' }
    getMethod() { return 'POST' }
    createResponse() { return new DeleteFilesResponse() }
}
export class GetVariant {
    /** @param {{variant?:string,path?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    variant;
    /** @type {string} */
    path;
    getTypeName() { return 'GetVariant' }
    getMethod() { return 'GET' }
    createResponse() { return new Blob() }
}
export class Hello {
    /** @param {{name?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?string} */
    name;
    getTypeName() { return 'Hello' }
    getMethod() { return 'GET' }
    createResponse() { return new HelloResponse() }
}
export class AdminData {
    constructor(init) { Object.assign(this, init) }
    getTypeName() { return 'AdminData' }
    getMethod() { return 'GET' }
    createResponse() { return new AdminDataResponse() }
}
export class GetTagArtifactIds {
    /** @param {{tag?:string,afterArtifactId?:number,skip?:number,orderBy?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    tag;
    /** @type {?number} */
    afterArtifactId;
    /** @type {?number} */
    skip;
    /** @type {?string} */
    orderBy;
    getTypeName() { return 'GetTagArtifactIds' }
    getMethod() { return 'GET' }
    createResponse() { return new GetTagArtifactIdsResponse() }
}
export class GetCategoryArtifactIds {
    /** @param {{category?:string,afterArtifactId?:number,skip?:number,orderBy?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    category;
    /** @type {?number} */
    afterArtifactId;
    /** @type {?number} */
    skip;
    /** @type {?string} */
    orderBy;
    getTypeName() { return 'GetCategoryArtifactIds' }
    getMethod() { return 'GET' }
    createResponse() { return new GetCategoryArtifactIdsResponse() }
}
export class GetThread {
    /** @param {{id?:number,url?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?number} */
    id;
    /** @type {?string} */
    url;
    getTypeName() { return 'GetThread' }
    getMethod() { return 'GET' }
    createResponse() { return new GetThreadResponse() }
}
export class CreateThread {
    /** @param {{url?:string,description?:string,externalRef?:string,args?:{ [index:string]: Object; },refId?:number,refIdStr?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    url;
    /** @type {string} */
    description;
    /** @type {?string} */
    externalRef;
    /** @type {?{ [index:string]: Object; }} */
    args;
    /** @type {?number} */
    refId;
    /** @type {string} */
    refIdStr;
    getTypeName() { return 'CreateThread' }
    getMethod() { return 'POST' }
    createResponse() { return new Thread() }
}
export class CreateGenerationComment {
    /** @param {{generationId?:string,replyId?:number,content?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    generationId;
    /** @type {?number} */
    replyId;
    /** @type {string} */
    content;
    getTypeName() { return 'CreateGenerationComment' }
    getMethod() { return 'POST' }
    createResponse() { return new Comment() }
}
export class CreateComment {
    /** @param {{threadId?:number,replyId?:number,content?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    threadId;
    /** @type {?number} */
    replyId;
    /** @type {string} */
    content;
    getTypeName() { return 'CreateComment' }
    getMethod() { return 'POST' }
    createResponse() { return new Comment() }
}
export class CreateCommentReport {
    /** @param {{commentId?:number,postReport?:PostReport,description?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    commentId;
    /** @type {PostReport} */
    postReport;
    /** @type {?string} */
    description;
    getTypeName() { return 'CreateCommentReport' }
    getMethod() { return 'POST' }
    createResponse() { }
}
export class CreateCommentReaction {
    /** @param {{commentId?:number,reaction?:Reaction}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    commentId;
    /** @type {Reaction} */
    reaction;
    getTypeName() { return 'CreateCommentReaction' }
    getMethod() { return 'POST' }
    createResponse() { }
}
export class DeleteCommentReaction {
    /** @param {{commentId?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    commentId;
    getTypeName() { return 'DeleteCommentReaction' }
    getMethod() { return 'DELETE' }
    createResponse() { }
}
export class GetDeletedRows {
    /** @param {{afterId?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?number} */
    afterId;
    getTypeName() { return 'GetDeletedRows' }
    getMethod() { return 'GET' }
    createResponse() { return new GetDeletedRowsResponse() }
}
export class MyInfo {
    constructor(init) { Object.assign(this, init) }
    getTypeName() { return 'MyInfo' }
    getMethod() { return 'GET' }
    createResponse() { return new UserInfo() }
}
export class UpdatePreferences {
    /** @param {{ratings?:Rating[],lastReadNotificationId?:number,lastReadAchievementId?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?Rating[]} */
    ratings;
    /** @type {?number} */
    lastReadNotificationId;
    /** @type {?number} */
    lastReadAchievementId;
    getTypeName() { return 'UpdatePreferences' }
    getMethod() { return 'POST' }
    createResponse() { return new EmptyResponse() }
}
export class UpdateUserAvatar {
    /** @param {{avatar?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?string} */
    avatar;
    getTypeName() { return 'UpdateUserAvatar' }
    getMethod() { return 'POST' }
    createResponse() { return new EmptyResponse() }
}
export class ClaimBonusCredits {
    constructor(init) { Object.assign(this, init) }
    getTypeName() { return 'ClaimBonusCredits' }
    getMethod() { return 'POST' }
    createResponse() { return new ClaimBonusCreditsResponse() }
}
export class QueueOpenAiChatCompletion {
    /** @param {{refId?:string,replyTo?:string,tag?:string,request?:OpenAiChat}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?string} */
    refId;
    /** @type {?string} */
    replyTo;
    /** @type {?string} */
    tag;
    /** @type {OpenAiChat} */
    request;
    getTypeName() { return 'QueueOpenAiChatCompletion' }
    getMethod() { return 'POST' }
    createResponse() { return new QueueOpenAiChatResponse() }
}
export class GetOpenAiChatStatus {
    /** @param {{id?:number,refId?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {?number} */
    id;
    /** @type {?string} */
    refId;
    getTypeName() { return 'GetOpenAiChatStatus' }
    getMethod() { return 'GET' }
    createResponse() { return new GetOpenAiChatStatusResponse() }
}
export class GetAiTaskRequest {
    /** @param {{refId?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    refId;
    getTypeName() { return 'GetAiTaskRequest' }
    getMethod() { return 'GET' }
    createResponse() { return '' }
}
export class CompleteOpenAiChat extends OpenAiChatResponse {
    /** @param {{refId?:string,id?:string,choices?:Choice[],created?:number,model?:string,system_fingerprint?:string,object?:string,usage?:OpenAiUsage,responseStatus?:ResponseStatus}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {string} */
    refId;
    getTypeName() { return 'CompleteOpenAiChat' }
    getMethod() { return 'POST' }
    createResponse() { return new EmptyResponse() }
}
export class GetAiTasks {
    /** @param {{deviceId?:string,models?:string[],types?:AiTaskType[],take?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    deviceId;
    /** @type {string[]} */
    models = [];
    /** @type {AiTaskType[]} */
    types = [];
    /** @type {?number} */
    take;
    getTypeName() { return 'GetAiTasks' }
    getMethod() { return 'GET' }
    createResponse() { return new GetAiTasksResponse() }
}
export class Authenticate {
    /** @param {{provider?:string,userName?:string,password?:string,rememberMe?:boolean,accessToken?:string,accessTokenSecret?:string,returnUrl?:string,errorView?:string,meta?:{ [index:string]: string; }}} [init] */
    constructor(init) { Object.assign(this, init) }
    /**
     * @type {string}
     * @description AuthProvider, e.g. credentials */
    provider;
    /** @type {string} */
    userName;
    /** @type {string} */
    password;
    /** @type {?boolean} */
    rememberMe;
    /** @type {string} */
    accessToken;
    /** @type {string} */
    accessTokenSecret;
    /** @type {string} */
    returnUrl;
    /** @type {string} */
    errorView;
    /** @type {{ [index:string]: string; }} */
    meta;
    getTypeName() { return 'Authenticate' }
    getMethod() { return 'POST' }
    createResponse() { return new AuthenticateResponse() }
}
export class QueryUsers extends QueryDb_1 {
    /** @param {{id?:string,skip?:number,take?:number,orderBy?:string,orderByDesc?:string,include?:string,fields?:string,meta?:{ [index:string]: string; }}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {?string} */
    id;
    getTypeName() { return 'QueryUsers' }
    getMethod() { return 'GET' }
    createResponse() { return new QueryResponse() }
}
export class QueryWorkflowGenerations extends QueryDb_1 {
    /** @param {{id?:string,skip?:number,take?:number,orderBy?:string,orderByDesc?:string,include?:string,fields?:string,meta?:{ [index:string]: string; }}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {?string} */
    id;
    getTypeName() { return 'QueryWorkflowGenerations' }
    getMethod() { return 'GET' }
    createResponse() { return new QueryResponse() }
}
export class MyArtifactReactions extends QueryDb_2 {
    /** @param {{afterId?:number,skip?:number,take?:number,orderBy?:string,orderByDesc?:string,include?:string,fields?:string,meta?:{ [index:string]: string; }}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {?number} */
    afterId;
    getTypeName() { return 'MyArtifactReactions' }
    getMethod() { return 'GET' }
    createResponse() { return new QueryResponse() }
}
export class MyAchievements extends QueryDb_2 {
    /** @param {{afterId?:number,skip?:number,take?:number,orderBy?:string,orderByDesc?:string,include?:string,fields?:string,meta?:{ [index:string]: string; }}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {?number} */
    afterId;
    getTypeName() { return 'MyAchievements' }
    getMethod() { return 'GET' }
    createResponse() { return new QueryResponse() }
}
export class QueryBookings extends QueryDb_1 {
    /** @param {{id?:number,skip?:number,take?:number,orderBy?:string,orderByDesc?:string,include?:string,fields?:string,meta?:{ [index:string]: string; }}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {?number} */
    id;
    getTypeName() { return 'QueryBookings' }
    getMethod() { return 'GET' }
    createResponse() { return new QueryResponse() }
}
export class QueryCoupons extends QueryDb_1 {
    /** @param {{id?:string,skip?:number,take?:number,orderBy?:string,orderByDesc?:string,include?:string,fields?:string,meta?:{ [index:string]: string; }}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {string} */
    id;
    getTypeName() { return 'QueryCoupons' }
    getMethod() { return 'GET' }
    createResponse() { return new QueryResponse() }
}
export class QueryWorkflows extends QueryDb_1 {
    /** @param {{afterId?:number,afterModifiedDate?:string,skip?:number,take?:number,orderBy?:string,orderByDesc?:string,include?:string,fields?:string,meta?:{ [index:string]: string; }}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {?number} */
    afterId;
    /** @type {?string} */
    afterModifiedDate;
    getTypeName() { return 'QueryWorkflows' }
    getMethod() { return 'GET' }
    createResponse() { return new QueryResponse() }
}
export class QueryWorkflowVersions extends QueryDb_1 {
    /** @param {{afterId?:number,afterModifiedDate?:string,skip?:number,take?:number,orderBy?:string,orderByDesc?:string,include?:string,fields?:string,meta?:{ [index:string]: string; }}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {?number} */
    afterId;
    /** @type {?string} */
    afterModifiedDate;
    getTypeName() { return 'QueryWorkflowVersions' }
    getMethod() { return 'GET' }
    createResponse() { return new QueryResponse() }
}
export class MyWorkflowVersionReactions extends QueryDb_2 {
    /** @param {{afterId?:number,skip?:number,take?:number,orderBy?:string,orderByDesc?:string,include?:string,fields?:string,meta?:{ [index:string]: string; }}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {?number} */
    afterId;
    getTypeName() { return 'MyWorkflowVersionReactions' }
    getMethod() { return 'GET' }
    createResponse() { return new QueryResponse() }
}
export class MyWorkflowGenerations extends QueryDb_1 {
    /** @param {{ids?:string[],threadId?:number,afterId?:number,afterModifiedDate?:string,skip?:number,take?:number,orderBy?:string,orderByDesc?:string,include?:string,fields?:string,meta?:{ [index:string]: string; }}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {?string[]} */
    ids;
    /** @type {?number} */
    threadId;
    /** @type {?number} */
    afterId;
    /** @type {?string} */
    afterModifiedDate;
    getTypeName() { return 'MyWorkflowGenerations' }
    getMethod() { return 'GET' }
    createResponse() { return new QueryResponse() }
}
export class MyCreditHistory extends QueryDb_1 {
    /** @param {{afterModifiedDate?:string,skip?:number,take?:number,orderBy?:string,orderByDesc?:string,include?:string,fields?:string,meta?:{ [index:string]: string; }}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {?string} */
    afterModifiedDate;
    getTypeName() { return 'MyCreditHistory' }
    getMethod() { return 'GET' }
    createResponse() { return new QueryResponse() }
}
export class QueryAssets extends QueryDb_1 {
    /** @param {{fileNames?:string[],search?:string,name?:string,type?:string,base?:string,fileName?:string,reference?:string,url?:string,length?:number,modifiedBy?:string,afterModifiedDate?:string,skip?:number,take?:number,orderBy?:string,orderByDesc?:string,include?:string,fields?:string,meta?:{ [index:string]: string; }}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {string[]} */
    fileNames;
    /** @type {?string} */
    search;
    /** @type {?string} */
    name;
    /** @type {?string} */
    type;
    /** @type {?string} */
    base;
    /** @type {?string} */
    fileName;
    /** @type {?string} */
    reference;
    /** @type {?string} */
    url;
    /** @type {?number} */
    length;
    /** @type {?string} */
    modifiedBy;
    /** @type {?string} */
    afterModifiedDate;
    getTypeName() { return 'QueryAssets' }
    getMethod() { return 'GET' }
    createResponse() { return new QueryResponse() }
}
export class MyThreads extends QueryDb_1 {
    /** @param {{afterId?:number,afterModifiedDate?:string,skip?:number,take?:number,orderBy?:string,orderByDesc?:string,include?:string,fields?:string,meta?:{ [index:string]: string; }}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {?number} */
    afterId;
    /** @type {?string} */
    afterModifiedDate;
    getTypeName() { return 'MyThreads' }
    getMethod() { return 'GET' }
    createResponse() { return new QueryResponse() }
}
export class QueryComments extends QueryDb_2 {
    /** @param {{threadId?:number,skip?:number,take?:number,orderBy?:string,orderByDesc?:string,include?:string,fields?:string,meta?:{ [index:string]: string; }}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {?number} */
    threadId;
    getTypeName() { return 'QueryComments' }
    getMethod() { return 'GET' }
    createResponse() { return new QueryResponse() }
}
export class QueryCommentReactions extends QueryDb_1 {
    /** @param {{threadId?:number,skip?:number,take?:number,orderBy?:string,orderByDesc?:string,include?:string,fields?:string,meta?:{ [index:string]: string; }}} [init] */
    constructor(init) { super(init); Object.assign(this, init) }
    /** @type {number} */
    threadId;
    getTypeName() { return 'QueryCommentReactions' }
    getMethod() { return 'GET' }
    createResponse() { return new QueryResponse() }
}
export class CreateBooking {
    /** @param {{name?:string,roomType?:RoomType,roomNumber?:number,cost?:number,bookingStartDate?:string,bookingEndDate?:string,notes?:string,couponId?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /**
     * @type {string}
     * @description Name this Booking is for */
    name;
    /** @type {RoomType} */
    roomType;
    /** @type {number} */
    roomNumber;
    /** @type {number} */
    cost;
    /** @type {string} */
    bookingStartDate;
    /** @type {?string} */
    bookingEndDate;
    /** @type {?string} */
    notes;
    /** @type {?string} */
    couponId;
    getTypeName() { return 'CreateBooking' }
    getMethod() { return 'POST' }
    createResponse() { return new IdResponse() }
}
export class UpdateBooking {
    /** @param {{id?:number,name?:string,roomType?:RoomType,roomNumber?:number,cost?:number,bookingStartDate?:string,bookingEndDate?:string,notes?:string,couponId?:string,cancelled?:boolean}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {?string} */
    name;
    /** @type {?RoomType} */
    roomType;
    /** @type {?number} */
    roomNumber;
    /** @type {?number} */
    cost;
    /** @type {?string} */
    bookingStartDate;
    /** @type {?string} */
    bookingEndDate;
    /** @type {?string} */
    notes;
    /** @type {?string} */
    couponId;
    /** @type {?boolean} */
    cancelled;
    getTypeName() { return 'UpdateBooking' }
    getMethod() { return 'PATCH' }
    createResponse() { return new IdResponse() }
}
export class DeleteBooking {
    /** @param {{id?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    getTypeName() { return 'DeleteBooking' }
    getMethod() { return 'DELETE' }
    createResponse() { }
}
export class CreateCoupon {
    /** @param {{id?:string,description?:string,discount?:number,expiryDate?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    id;
    /** @type {string} */
    description;
    /** @type {number} */
    discount;
    /** @type {string} */
    expiryDate;
    getTypeName() { return 'CreateCoupon' }
    getMethod() { return 'POST' }
    createResponse() { return new IdResponse() }
}
export class UpdateCoupon {
    /** @param {{id?:string,description?:string,discount?:number,expiryDate?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    id;
    /** @type {string} */
    description;
    /** @type {number} */
    discount;
    /** @type {string} */
    expiryDate;
    getTypeName() { return 'UpdateCoupon' }
    getMethod() { return 'PATCH' }
    createResponse() { return new IdResponse() }
}
export class DeleteCoupon {
    /** @param {{id?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    id;
    getTypeName() { return 'DeleteCoupon' }
    getMethod() { return 'DELETE' }
    createResponse() { }
}
export class CreateWorkflowVersionReaction {
    /** @param {{versionId?:number,reaction?:Reaction}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    versionId;
    /** @type {Reaction} */
    reaction;
    getTypeName() { return 'CreateWorkflowVersionReaction' }
    getMethod() { return 'POST' }
    createResponse() { return new WorkflowVersionReaction() }
}
export class DeleteWorkflowVersionReaction {
    /** @param {{versionId?:number,reaction?:Reaction}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    versionId;
    /** @type {Reaction} */
    reaction;
    getTypeName() { return 'DeleteWorkflowVersionReaction' }
    getMethod() { return 'DELETE' }
    createResponse() { return new IdResponse() }
}
export class DeleteMyWorkflowGeneration {
    /** @param {{id?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {string} */
    id;
    getTypeName() { return 'DeleteMyWorkflowGeneration' }
    getMethod() { return 'DELETE' }
    createResponse() { return new EmptyResponse() }
}
export class UpdateThread {
    /** @param {{id?:number,description?:string,args?:{ [index:string]: Object; }}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {?string} */
    description;
    /** @type {?{ [index:string]: Object; }} */
    args;
    getTypeName() { return 'UpdateThread' }
    getMethod() { return 'PATCH' }
    createResponse() { return new Thread() }
}
export class DeleteThread {
    /** @param {{id?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    getTypeName() { return 'DeleteThread' }
    getMethod() { return 'DELETE' }
    createResponse() { }
}
export class UpdateComment {
    /** @param {{id?:number,content?:string}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    /** @type {?string} */
    content;
    getTypeName() { return 'UpdateComment' }
    getMethod() { return 'PATCH' }
    createResponse() { return new Comment() }
}
export class DeleteComment {
    /** @param {{id?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    id;
    getTypeName() { return 'DeleteComment' }
    getMethod() { return 'DELETE' }
    createResponse() { }
}
export class CreateThreadReaction {
    /** @param {{threadId?:number,reaction?:Reaction}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    threadId;
    /** @type {Reaction} */
    reaction;
    getTypeName() { return 'CreateThreadReaction' }
    getMethod() { return 'POST' }
    createResponse() { }
}
export class DeleteThreadReaction {
    /** @param {{threadId?:number}} [init] */
    constructor(init) { Object.assign(this, init) }
    /** @type {number} */
    threadId;
    getTypeName() { return 'DeleteThreadReaction' }
    getMethod() { return 'DELETE' }
    createResponse() { return new EmptyResponse() }
}

