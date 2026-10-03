using ServiceStack;
using ServiceStack.IO;
using ServiceStack.Web;
namespace MyApp.ServiceInterface;

public static class PublishedViewerShell
{
    public static async Task<string> Render(IVirtualPathProvider sources, IRequest request, string page)
    {
        var viewerHtml = await sources.GetFile("llms/index.html").ReadAllTextAsync();
        var baseHref = $"<base href=\"{request.ResolveAbsoluteUrl("~/llms/")}\">";
        viewerHtml = viewerHtml.Replace("<base />", baseHref, StringComparison.OrdinalIgnoreCase);
        viewerHtml = viewerHtml.Replace("/*App*/", $"/*include: {page}*/");

        // Handle simple server side includes like /*include: filename.ext*/
        viewerHtml = System.Text.RegularExpressions.Regex.Replace(viewerHtml, @"/\*include:\s*([^*\s]+)\*/", match =>
        {
            var filename = match.Groups[1].Value.Trim();
            if (filename.Contains("..") || filename.StartsWith('/') || filename.StartsWith('\\'))
                return match.Value;

            var includePath = sources.GetFile($"llms/{filename}");
            if (includePath == null)
                return match.Value;

            try
            {
                return includePath.ReadAllText();
            }
            catch
            {
                return match.Value;
            }
        });

        viewerHtml = viewerHtml.Replace("<script type=\"importmap\"></script>",
            """
            <script type="importmap">
            {
                "imports": {
                    "vue-prod": "/lib/mjs/vue.min.mjs",
                    "vue": "/lib/mjs/vue.mjs",
                    "vue-router": "/lib/mjs/vue-router.min.mjs",
                    "@servicestack/client": "/lib/mjs/servicestack-client.mjs",
                    "@servicestack/vue": "/lib/mjs/servicestack-vue.mjs",
                    "marked": "/lib/mjs/marked.min.mjs",
                    "highlight.js": "/lib/mjs/highlight.min.mjs",
                    "chart.js": "/lib/mjs/chart.js",
                    "color.js": "/lib/mjs/color.js",
                    "katex": "/llms/katex/katex.min.mjs"
                }
            }
            </script>
            """);
        return viewerHtml;
    }

}
