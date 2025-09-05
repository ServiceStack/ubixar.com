using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.OrmLite;

namespace MyApp.ServiceInterface;

public class TagServices(AppData appData) : Service
{
    public object Any(GetTagArtifactIds request)
    {
        var tag = appData.GetTag(request.Tag);
        if (tag == null)
            throw HttpError.NotFound("Tag not found");
        
        var q = Db.From<ArtifactTag>()
            .Where(x => x.TagId == tag.Id)
            .Take(1000)
            .Select(x => x.ArtifactId);
        if (request.AfterArtifactId != null)
        {
            q.Where(x => x.ArtifactId > request.AfterArtifactId);
        }
        if (!string.IsNullOrEmpty(request.OrderBy))
        {
            if (request.OrderBy.ToLower().StartsWith("rand"))
            {
                q.OrderByRandom();
            }
            else
            {
                q.OrderByFields(request.OrderBy);
            }
        }
        else
        {
            q.OrderBy(x => x.Id);
        }
        if (request.Skip != null)
        {
            q.Skip(request.Skip.Value);
        }
        var ret = new GetTagArtifactIdsResponse
        {
            Total = (int)Db.Count(q),
            Results = Db.Select(q).Map(x => x.ArtifactId),
        };
        return ret;
    }
    
    public object Any(GetCategoryArtifactIds request)
    {
        var category = appData.GetCategory(request.Category);
        if (category == null)
            throw HttpError.NotFound("Category not found");
        
        var q = Db.From<ArtifactCategory>()
            .Where(x => x.CategoryId == category.Id)
            .Take(1000)
            .Select(x => x.ArtifactId);
        if (request.AfterArtifactId != null)
        {
            q.Where(x => x.ArtifactId > request.AfterArtifactId);
        }
        if (!string.IsNullOrEmpty(request.OrderBy))
        {
            if (request.OrderBy.ToLower().StartsWith("rand"))
            {
                q.OrderByRandom();
            }
            else
            {
                q.OrderByFields(request.OrderBy);
            }
        }
        else
        {
            q.OrderBy(x => x.Id);
        }
        if (request.Skip != null)
        {
            q.Skip(request.Skip.Value);
        }
        var ret = new GetTagArtifactIdsResponse
        {
            Total = (int)Db.Count(q),
            Results = Db.Select(q).Map(x => x.ArtifactId),
        };
        return ret;
    }
}