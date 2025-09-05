using ServiceStack;

namespace MyApp.ServiceModel;

[Tag(Tags.Files)]
[ValidateApiKey]
[Route("/files/{**Path}")]
public class DeleteFile : IDelete, IReturn<EmptyResponse>
{
    [ValidateNotEmpty]
    public string Path { get; set; } = null!;
}

[Tag(Tags.Files)]
[ValidateApiKey]
public class DeleteFiles : IPost, IReturn<DeleteFilesResponse>
{
    public List<string> Paths { get; set; } = null!;
}
public class DeleteFilesResponse
{
    public List<string> Deleted { get; set; } = [];
    public List<string> Missing { get; set; } = [];
    public List<string> Failed { get; set; } = [];
    public ResponseStatus? ResponseStatus { get; set; }
}
