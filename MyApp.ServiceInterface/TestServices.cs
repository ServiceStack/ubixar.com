using ServiceStack;

namespace MyApp.ServiceInterface;

public class TestUpload : IPost, IReturn<TestUpload>
{
    public int Int { get; set; }
    public int? NullableId { get; set; }
    public long Long { get; set; }
    public double Double { get; set; }
    public string String { get; set; }
    public DateTime DateTime { get; set; }
    
    public int[] IntArray { get; set; }
    public List<int> IntList { get; set; }
    public string[] StringArray { get; set; }
    public List<string> StringList { get; set; }
    public Poco[] PocoArray { get; set; }
    public List<Poco> PocoList { get; set; }
    public byte?[] NullableByteArray { get; set; }
    public List<byte?> NullableByteList { get; set; }
    public DateTime?[] NullableDateTimeArray { get; set; }
    public List<DateTime?> NullableDateTimeList { get; set; }
    public Dictionary<string, List<Poco>> PocoLookup { get; set; }
    public Dictionary<string, List<Dictionary<string,Poco>>> PocoLookupMap { get; set; } 
    public Dictionary<string, List<string>>? MapList { get; set; }
}

public class Poco
{
    public string Name { get; set; }
}
public class SubType
{
    public int Id { get; set; }
    public string Name { get; set; }
}

public class TestServices : Service
{
    public object Any(TestUpload request)
    {
        return request;
    }
}