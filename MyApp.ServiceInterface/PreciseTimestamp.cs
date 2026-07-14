using System.Diagnostics;
using System.Text;
using ServiceStack.Text;

namespace MyApp.ServiceInterface;

public static class PreciseTimestamp
{
    private static readonly DateTime BaseTime = DateTime.UtcNow;
    private static readonly Stopwatch Stopwatch = Stopwatch.StartNew();

    /// <summary>
    /// Gets the current UTC time based on a high-resolution timer to provide more precise time measurements.
    /// </summary>
    /// <returns>The current UTC time as a <see cref="DateTime"/> instance.</returns>
    public static DateTime GetUtcNow()
    {
        return BaseTime.Add(Stopwatch.Elapsed);
    }

    /// <summary>
    /// Represents the most recent timestamp in ticks, ensuring monotonicity by
    /// always returning a value that is greater than or equal to the previous value.
    /// Used internally to provide a thread-safe mechanism for consistent time measurement.
    /// </summary>
    private static long lastTimeStamp = DateTime.UtcNow.Ticks;
    public static long UniqueUtcNowTicks
    {
        get
        {
            long orig, newval;
            do
            {
                orig = lastTimeStamp;
                long now = DateTime.UtcNow.Ticks;
                newval = Math.Max(now, orig + 1);
            } while (Interlocked.CompareExchange(ref lastTimeStamp, newval, orig) != orig);
            return newval;
        }
    }
    
    
    public static long TimestampEpoch = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc).Ticks;
    public static long ToTimestamp(long ticks)
    {
        return (ticks - TimestampEpoch) / TimeSpan.TicksPerMillisecond;
    }
    
    private static long lastUniqueTimestamp = ToTimestamp(DateTime.UtcNow.Ticks);
    public static long UniqueTimestamp
    {
        get
        {
            long orig, newval;
            do
            {
                orig = lastUniqueTimestamp;
                long now = ToTimestamp(DateTime.UtcNow.Ticks);
                newval = Math.Max(now, orig + 1);
            } while (Interlocked.CompareExchange(ref lastUniqueTimestamp, newval, orig) != orig);
            return newval;
        }
    }
    
    const string Base64UrlCars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    public static string EncodeBase64Url(this long value)
    {
        if (value == 0) return Base64UrlCars[0].ToString();
        var sb = new StringBuilder();
        while (value > 0)
        {
            sb.Insert(0, Base64UrlCars[(int)(value % 64)]);
            value /= 64;
        }
        return sb.ToString();
    }

    public static long DecodeBase64Url(this string encoded)
    {
        long value = 0;
        foreach (var c in encoded)
        {
            value = value * 64 + Base64UrlCars.IndexOf(c);
        }
        return value;
    }

    public static string ToSafeSlug(this string name)
    {
        var sb = new StringBuilder(name.Length);
        bool lastWasUnderscore = false;
        foreach (var c in name)
        {
            if (Base64UrlCars.Contains(c))
            {
                sb.Append(c);
                lastWasUnderscore = c == '_';
            }
            else if (!lastWasUnderscore)
            {
                sb.Append('_');
                lastWasUnderscore = true;
            }
        }
        return sb.ToString();
    }
}
