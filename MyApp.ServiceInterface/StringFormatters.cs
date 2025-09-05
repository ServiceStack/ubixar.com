using System;
using System.Collections.Generic;
using System.Linq;

namespace MyApp.ServiceInterface;

public static class StringFormatters
{
    private static readonly Dictionary<string, string> ReplaceWords = new()
    {
        { "sdxl", "SDXL" },
        { "sdxl-lightning", "SDXL Lightning" },
        { "sdxl-turbo", "SDXL Turbo" },
        { "sd-1.5", "SD 1.5" },
        { "sd-3.5", "SD 3.5" },
        { "sd-3.5-large", "SD 3.5 Large" },
        { "sdxl-base", "SDXL Base" },
        { "hidream", "HiDream" },
        { "hidream-i1", "HiDream-I1" },
        { "fp8", "FP8" },
        { "turbo", "Turbo" },
        { "v1", "V1" },
        { "v2", "V2" },
        { "v3", "V3" },
        { "v4", "V4" },
        { "v5", "V5" },
        { "v6", "V6" },
        { "v7", "V7" },
        { "v8", "V8" },
        { "v9", "V9" },
        { "to", "to" },
        { "with", "with" }
    };

    // Replace word with its replacement if it exists
    public static string FormatWord(string word)
    {
        return ReplaceWords.TryGetValue(word, out var replaceWord) 
            ? replaceWord 
            : char.ToUpper(word[0]) + word[1..];
    }

    // Format category name for display
    public static string FormatName(string name)
    {
        return string.Join(" ", name.Split('_').Select(FormatWord));
    }
    
    public static long HumanSizeToBytes(string size)
    {
        // Convert human readable size to bytes
        if (size.EndsWith("KB") || size.EndsWith("K"))
            return (long) (double.Parse(size[..^2]) * 1024);
        if (size.EndsWith("MB") || size.EndsWith("M"))
            return (long) (double.Parse(size[..^2]) * 1024 * 1024);
        if (size.EndsWith("GB") || size.EndsWith("G"))
            return (long) (double.Parse(size[..^2]) * 1024 * 1024 * 1024);
        if (size.EndsWith("TB") || size.EndsWith("T"))
            return (long) (double.Parse(size[..^2]) * 1024 * 1024 * 1024);
        if (size.EndsWith("B"))
            return (long) double.Parse(size[..^1]);
        // if no unit, assume bytes
        if (double.TryParse(size, out var bytes))
            return (long) bytes;
        return 0;
    }    
}