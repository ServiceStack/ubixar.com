using System.Text.RegularExpressions;
using MyApp.ServiceModel;

namespace MyApp.ServiceInterface;

public class DecisionPublishingOptions
{
    public bool AutoTagUntaggedRecipes { get; set; } = true;
    public string TaggingModel { get; set; } = "~typesafe/jev-latest";
    public int TaggingTimeoutSeconds { get; set; } = 10;
    public List<DecisionTagDefinition> Tags { get; set; } = [];

    public void Validate()
    {
        if (TaggingTimeoutSeconds is < 1 or > 12 || string.IsNullOrWhiteSpace(TaggingModel) || TaggingModel.Length > 120)
            throw new InvalidOperationException("DecisionPublishing: configure a model and tagging timeout between 1 and 12 seconds.");
        if (Tags == null || Tags.Count > 100 || Tags.Any(tag => tag == null ||
            string.IsNullOrWhiteSpace(tag.Label) || tag.Label.Length > 40 || tag.Label.Trim() != tag.Label || Regex.IsMatch(tag.Label, @"[\x00-\x1f,]") || tag.Description == null || tag.Description.Length > 1000 ||
            tag.Group is not ("content" or "tag" or "context" or "task")) || Tags.Select(tag => TagKey(tag.Label)).Distinct().Count() != Tags.Count)
            throw new InvalidOperationException("DecisionPublishing: provide up to 100 unique tag labels of up to 40 characters with content or tag groups.");
    }

    public static bool IsContent(DecisionTagDefinition tag) => tag.Group is "content" or "context";

    // Accept older lowercase/hyphenated recipe values without maintaining another tag name.
    public static string TagKey(string label) => Regex.Replace(label.Trim(), @"\s+", "-").ToLowerInvariant();
    public string CanonicalLabel(string value) => Tags.FirstOrDefault(tag => TagKey(tag.Label) == TagKey(value))?.Label ?? value;
    public bool IsContentLabel(string value) => Tags.Any(tag => IsContent(tag) && TagKey(tag.Label) == TagKey(value));

    public DecisionTagCatalog Catalog() => new() { Version = 3, Tags = Tags.Select(tag => new DecisionTag {
        Label = tag.Label, Group = IsContent(tag) ? "content" : "tag"
    }).ToList() };
}
public class DecisionTagDefinition
{
    public string Label { get; set; } = "";
    public string Group { get; set; } = "tag";
    public string Description { get; set; } = "";
}
