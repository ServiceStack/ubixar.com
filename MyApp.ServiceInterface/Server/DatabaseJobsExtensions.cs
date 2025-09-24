using Microsoft.Extensions.DependencyInjection;
using ServiceStack.Data;

namespace ServiceStack;

public static class DatabaseJobsExtensions
{
    // Admin UI requires AutoQuery functionality
    public static void RegisterAutoQueryDbIfNotExists(this AutoQueryFeature feature)
    {
        ServiceStackHost.GlobalAfterConfigureServices.Add(c =>
        {
            if (!c.Exists<IAutoQueryDb>())
            {
                c.AddSingleton<IAutoQueryDb>(c => 
                    feature.CreateAutoQueryDb(c.GetService<IDbConnectionFactory>()));
            }
        });
    }    
}