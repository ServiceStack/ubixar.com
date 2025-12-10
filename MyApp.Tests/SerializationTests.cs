using MyApp.ServiceModel;
using NUnit.Framework;
using ServiceStack;
using ServiceStack.Text;

namespace MyApp.Tests;

public class SerializationTests
{
    [Test]
    public void Can_deserialize_UpdateGenerationAsset()
    {
        var to = new UpdateGenerationAsset
        {
            GenerationId = "7edb51ed05474b8186a065e2688ad8ba",
            AssetUrl = "/artifacts/45ef7dcb566b7ee223287fc0744683831fb24418b169828142b6a4d96d6a6af9.webp",
            Rating = Rating.PG13
        };
        var json = to.ToJson();
        var fromJson = json.FromJson<UpdateGenerationAsset>();
        Assert.That(fromJson.GenerationId, Is.EqualTo(to.GenerationId));
        Assert.That(fromJson.AssetUrl, Is.EqualTo(to.AssetUrl));
        Assert.That(fromJson.Rating, Is.EqualTo(to.Rating));

        fromJson = ClientConfig.FromJson<UpdateGenerationAsset>(json);
        Assert.That(fromJson.GenerationId, Is.EqualTo(to.GenerationId));
        Assert.That(fromJson.AssetUrl, Is.EqualTo(to.AssetUrl));
        Assert.That(fromJson.Rating, Is.EqualTo(to.Rating));
    }
}