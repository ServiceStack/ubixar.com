using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Identity;
using NUnit.Framework;
using ServiceStack;
using ServiceStack.Testing;
using ServiceStack.OrmLite;
using ServiceStack.Data;
using ServiceStack.Text;
using MyApp.ServiceInterface;
using MyApp.ServiceModel;
using MyApp.Data;

namespace MyApp.Tests;

public class UsernameGeneratorTests : TestBase
{
    private readonly ServiceStackHost appHost;

    public UsernameGeneratorTests()
    {
        appHost = new BasicAppHost().Init();
    }

    [OneTimeTearDown]
    public void OneTimeTearDown() => appHost.Dispose();
    
    [Test]
    public void Can_GetPrefixes_And_Suffixes()
    {
        var prefixes = Usernames.Prefixes;
        var suffixes = Usernames.Suffixes;

        Assert.That(prefixes, Is.Not.Null);
        Assert.That(prefixes, Is.Not.Empty);
        Assert.That(prefixes, Contains.Item("Acorn"));
        Assert.That(prefixes, Contains.Item("Zippy"));

        Assert.That(suffixes, Is.Not.Null);
        Assert.That(suffixes, Is.Not.Empty);
        Assert.That(suffixes, Contains.Item("Abu"));
        Assert.That(suffixes, Contains.Item("Zorro"));
    }

    [Test]
    public void Can_GenerateCandidateUsernames()
    {
        var count = 100;
        var usernames = Usernames.GenerateCandidateUsernames(count);
        
        Assert.That(usernames, Is.Not.Null);
        Assert.That(usernames.Count, Is.EqualTo(count));

        // Check that they are formatted as expected (concatenation of prefix and suffix)
        // Also check if there's a bias towards matching starting letters.
        int matchingFirstLetterCount = 0;
        foreach (var username in usernames)
        {
            // Find a prefix that matches the start of the username (ordering by length desc to match Keen-eyed before Keen)
            var prefix = Usernames.Prefixes.OrderByDescending(p => p.Length).FirstOrDefault(p => username.StartsWith(p, StringComparison.OrdinalIgnoreCase));
            Assert.That(prefix, Is.Not.Null, $"Username '{username}' should start with a valid prefix");

            var suffix = username.Substring(prefix.Length);
            var hasSuffix = Usernames.Suffixes.Any(s => s.Equals(suffix, StringComparison.OrdinalIgnoreCase));
            Assert.That(hasSuffix, Is.True, $"Username '{username}' should end with a valid suffix '{suffix}'");

            if (char.ToUpper(prefix[0]) == char.ToUpper(suffix[0]))
            {
                matchingFirstLetterCount++;
            }
        }

        // With 50% bias + 1/26 random chance of matching by chance, we expect around ~50-55% matching starting letters.
        // Let's assert that it's significantly higher than a pure random chance (which would be ~4%).
        // At least 25 out of 100 should match.
        Assert.That(matchingFirstLetterCount, Is.GreaterThan(25), $"Expected significant number of matching first letters due to bias, found: {matchingFirstLetterCount}");
    }

    [Test]
    public void Can_GenerateCandidateUsernames_With_PartialUserName()
    {
        var count = 10;
        var usernames = Usernames.GenerateCandidateUsernames(count, "Alex");
        
        Assert.That(usernames, Is.Not.Null);
        Assert.That(usernames.Count, Is.EqualTo(count));

        foreach (var username in usernames)
        {
            Assert.That(username.StartsWith("A", StringComparison.OrdinalIgnoreCase), Is.True, $"Username '{username}' should start with 'A' since partialUserName starts with 'A'");
        }

        usernames.PrintDump();
    }

    [Test]
    public void Can_GenerateCandidateUsernames_MinimizesDuplicates()
    {
        var count = 15;
        var usernames = Usernames.GenerateCandidateUsernames(count);
        
        Assert.That(usernames.Count, Is.EqualTo(count));

        var prefixesUsed = new List<string>();
        var suffixesUsed = new List<string>();

        foreach (var username in usernames)
        {
            var prefix = Usernames.Prefixes.OrderByDescending(p => p.Length).FirstOrDefault(p => username.StartsWith(p, StringComparison.OrdinalIgnoreCase));
            Assert.That(prefix, Is.Not.Null);
            var suffix = username.Substring(prefix.Length);

            prefixesUsed.Add(prefix);
            suffixesUsed.Add(suffix);
        }

        var uniquePrefixes = prefixesUsed.Distinct(StringComparer.OrdinalIgnoreCase).Count();
        var uniqueSuffixes = suffixesUsed.Distinct(StringComparer.OrdinalIgnoreCase).Count();

        // In a batch of 15, we expect all or almost all to have unique prefixes and suffixes.
        // Let's assert that at least 13 are unique (allowing very minor overlap under rare circumstances).
        Assert.That(uniquePrefixes, Is.GreaterThanOrEqualTo(13), $"Expected at least 13 unique prefixes in a batch of 15, but found: {uniquePrefixes}");
        Assert.That(uniqueSuffixes, Is.GreaterThanOrEqualTo(13), $"Expected at least 13 unique suffixes in a batch of 15, but found: {uniqueSuffixes}");
    }
}

[Explicit("Integration tests")]
public class UsernameDbTests : DatabaseTestsBase
{
    [Test]
    public async Task Can_GetUnusedUsernames_With_Db()
    {
        using var db = OpenDb();
        var candidates = new List<string> { "TestUserUnique1", "TestUserUnique2" };
        var unused = await db.GetUnusedUsernames(candidates);
        
        Assert.That(unused, Is.Not.Null);
        Assert.That(unused, Contains.Item("TestUserUnique1"));
        Assert.That(unused, Contains.Item("TestUserUnique2"));
    }
}
