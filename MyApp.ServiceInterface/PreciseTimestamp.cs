using System.Diagnostics;

namespace MyApp.ServiceInterface;

public class PreciseTimestamp
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
}