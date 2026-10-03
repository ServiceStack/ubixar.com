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
            string.IsNullOrEmpty(tag.Name) || tag.Name.Length > 40 || !Regex.IsMatch(tag.Name, @"^[a-z0-9]+(?:-[a-z0-9]+)*$") ||
            tag.Label == null || tag.Label.Length > 80 || tag.Description == null || tag.Description.Length > 1000 ||
            tag.Group is not ("context" or "task")) || Tags.Select(tag => tag.Name).Distinct().Count() != Tags.Count)
            throw new InvalidOperationException("DecisionPublishing: provide up to 100 unique lowercase/hyphenated tags with context or task groups.");
    }

    public DecisionTagCatalog Catalog() => new() { Tags = Tags.Select(tag => new DecisionTag {
        Name = tag.Name, Label = string.IsNullOrWhiteSpace(tag.Label) ? tag.Name : tag.Label, Group = tag.Group
    }).ToList() };
}
public class DecisionTagDefinition
{
    public string Name { get; set; } = "";
    public string Label { get; set; } = "";
    public string Group { get; set; } = "task";
    public string Description { get; set; } = "";
}
