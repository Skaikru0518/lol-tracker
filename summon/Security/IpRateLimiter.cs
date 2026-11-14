namespace summon.Security;

/// <summary>
/// The original's per-IP limit: 30 requests a minute per IP and area (widget, matches, achievements, ranked batch).
/// In memory and per instance: good enough for one replica, not a shared limit.
/// </summary>
public class IpRateLimiter(TimeProvider time)
{
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(1);
    private const int MaxRequests = 30;
    private const int SweepAtKeys = 10_000;

    private readonly Dictionary<string, List<DateTimeOffset>> hits = [];

    /// <summary>Counts one request for the key and says whether it is still within the limit.</summary>
    public bool Allow(string key)
    {
        var now = time.GetUtcNow();
        lock (hits)
        {
            List<DateTimeOffset> Recent(string k) => hits.TryGetValue(k, out var t) ? t.Where(at => now - at < Window).ToList() : [];
            if (hits.Count > SweepAtKeys)
                foreach (var k in hits.Keys.ToList())
                    if (Recent(k).Count == 0) hits.Remove(k);
            var times = Recent(key);
            if (times.Count >= MaxRequests)
            {
                hits[key] = times;
                return false;
            }
            times.Add(now);
            hits[key] = times;
            return true;
        }
    }

    /// <summary>Whether this client has used up its budget for the area; a client whose IP is unknown is never limited.</summary>
    public bool Limited(string area, ClientIp client) => client.Value is { } ip && !Allow($"{area}:{ip}");
}
