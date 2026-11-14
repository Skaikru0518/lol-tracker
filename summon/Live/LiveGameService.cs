using Microsoft.Extensions.Caching.Memory;
using summon.Riot;

namespace summon.Live;

public class LiveGameService(RiotClient riot, IMemoryCache cache)
{
    // Every open profile polls once a minute; one 30 s entry per player keeps that at most two Riot calls a minute per player
    private static readonly TimeSpan MaxAge = TimeSpan.FromSeconds(30);

    /// <summary>The game the player is in right now, or null; Riot errors are thrown and not cached.</summary>
    public Task<RiotLiveGame?> GetAsync(string platform, string puuid, CancellationToken ct = default) =>
        cache.GetOrCreateAsync($"live-game:{puuid}", entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = MaxAge;
            return riot.GetActiveGameAsync(platform, puuid, ct);
        });
}
