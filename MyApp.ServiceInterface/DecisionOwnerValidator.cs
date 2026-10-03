using ServiceStack;
using ServiceStack.Auth;
using ServiceStack.Web;
namespace MyApp.ServiceInterface;

// Catalog management accepts either a validated publisher key or the site's owner session.
// API-key writes and session mutations keep their separate DTO validation rules.
public class DecisionOwnerValidator : TypeValidator, IAuthTypeValidator
{
    public DecisionOwnerValidator() : base("Unauthorized", "Sign in or connect a publisher account.", 401) { }
    public override async Task<bool> IsValidAsync(object dto, IRequest request)
    {
        if (request.GetClaimsPrincipal().IsAuthenticated()) return true;
        var resolver = HostContext.TryResolve<IApiKeyResolver>();
        var source = HostContext.TryResolve<IApiKeySource>();
        if (resolver == null || source == null) return false;
        return await new ApiKeyValidator(() => source, () => resolver).IsValidAsync(dto, request);
    }
}
