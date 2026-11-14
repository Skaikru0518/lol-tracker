using System.Net;

namespace summon.Riot;

/// <summary>
/// In-process sliding-window limiter for the Riot key, per routing host (Riot counts limits per host), like the original's
/// RateLimiter: a call waits up to five seconds for a free slot, and a 429's Retry-After holds every call to that host back.
/// </summary>
public sealed class RiotRateLimiter
{
    // Key limit is 20 / 1 s and 100 / 2 min; slightly lower for clock drift
    private static readonly (int Limit, TimeSpan Window)[] Windows = [(18, TimeSpan.FromSeconds(1)), (95, TimeSpan.FromMinutes(2))];
    private static readonly TimeSpan Longest = Windows.Max(w => w.Window);
    private static readonly TimeSpan MaxWait = TimeSpan.FromSeconds(5);

    private sealed class Host
    {
        public readonly List<DateTimeOffset> Stamps = [];
        public DateTimeOffset BlockedUntil;
    }

    private readonly Dictionary<string, Host> hosts = [];

    /// <summary>False when no slot frees up within five seconds.</summary>
    public async Task<bool> AcquireAsync(string host, CancellationToken ct)
    {
        var deadline = DateTimeOffset.UtcNow + MaxWait;
        while (true)
        {
            TimeSpan wait;
            lock (hosts)
            {
                var state = StateOf(host);
                var now = DateTimeOffset.UtcNow;
                wait = WaitTime(state, now);
                if (wait <= TimeSpan.Zero)
                {
                    state.Stamps.Add(now);
                    return true;
                }
            }
            if (DateTimeOffset.UtcNow + wait > deadline) return false;
            await Task.Delay(wait, ct);
        }
    }

    public void Block(string host, TimeSpan duration)
    {
        lock (hosts)
        {
            var state = StateOf(host);
            var until = DateTimeOffset.UtcNow + duration;
            if (until > state.BlockedUntil) state.BlockedUntil = until;
        }
    }

    private Host StateOf(string host) => hosts.TryGetValue(host, out var state) ? state : hosts[host] = new Host();

    private static TimeSpan WaitTime(Host state, DateTimeOffset now)
    {
        state.Stamps.RemoveAll(t => t <= now - Longest);
        var wait = state.BlockedUntil - now;
        foreach (var (limit, window) in Windows)
        {
            var inWindow = state.Stamps.Where(t => t > now - window).ToList();
            // The slot frees up when the oldest call that still counts against the limit leaves the window
            if (inWindow.Count >= limit) wait = TimeSpan.FromTicks(Math.Max(wait.Ticks, (inWindow[^limit] + window - now).Ticks));
        }
        return wait;
    }
}

/// <summary>Runs every Riot request through <see cref="RiotRateLimiter"/>; a call that cannot get a slot fails like a real 429.</summary>
public sealed class RiotRateLimitHandler(RiotRateLimiter limiter) : DelegatingHandler
{
    private static readonly TimeSpan DefaultRetry = TimeSpan.FromSeconds(5);

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        var host = request.RequestUri!.Host;
        if (!await limiter.AcquireAsync(host, ct))
            return new HttpResponseMessage(HttpStatusCode.TooManyRequests) { RequestMessage = request };

        var response = await base.SendAsync(request, ct);
        // The key is shared with the live site, so a 429 can come from calls this process never counted
        if (response.StatusCode == HttpStatusCode.TooManyRequests) limiter.Block(host, response.Headers.RetryAfter?.Delta ?? DefaultRetry);
        return response;
    }
}
