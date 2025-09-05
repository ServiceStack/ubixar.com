using ServiceStack;

namespace MyApp.ServiceInterface;

public static class Routes
{
    public static string GetGenerationApiPrompt(string generationId) => 
        $"/api/{nameof(GetGenerationApiPrompt)}".AddQueryParam("id", generationId);
}
