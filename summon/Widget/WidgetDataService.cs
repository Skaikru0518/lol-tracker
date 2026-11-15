using System.Collections.Concurrent;
using System.Net;
using Microsoft.EntityFrameworkCore;
using summon.Accounts;
using summon.Data;
using summon.Riot;

namespace summon.Widget;

/// <summary>
/// The data one widget shows, built like the original's buildWidgetData: every widget showing the same summoner and queue
/// shares one call budget (ranked every minute, match ids every 5 minutes or when the ranked game count
/// moves, at most 10 new matches per poll, the live game every 2 minutes), and a rate limited Riot just serves what is known.
/// </summary>
public class WidgetDataService(SummonDbContext db, RiotClient riot, AccountService accounts, RankedService ranked, MatchService matches, DataDragon dataDragon)
{
    private static readonly long Min = 60_000;
    private static readonly TimeSpan RankedEvery = TimeSpan.FromMinutes(1);
    private static readonly long IdsEveryMs = 5 * Min;
    private static readonly long LiveEveryMs = 2 * Min;
    private static readonly long IdsLookbackMs = 24 * 60 * Min;
    private const int IdCount = 20;
    private const int SeasonGameCount = 10;
    private const int MatchFetchCap = 10;
    private const int MaxStates = 200;
    private static readonly long StateIdleMs = 15 * Min;

    private static readonly Dictionary<string, (int QueueId, string QueueType)> QueueIds = new()
    {
        ["solo"] = (420, "RANKED_SOLO_5x5"),
        ["flex"] = (440, "RANKED_FLEX_SR"),
    };

    private sealed class CallState
    {
        public readonly SemaphoreSlim Gate = new(1, 1);
        public long UsedAt;
        public long IdsAt = long.MinValue / 2;
        public List<string>? Ids;
        public int? IdsTotal;
        public long LiveAt = long.MinValue / 2;
        public string? LiveChampion;
        public long? LiveStartedAt;
        // Session games trimmed to the player's own participant, so a poll re-reads the database only for new ids
        public readonly Dictionary<string, RiotMatch> Matches = [];
    }

    // Per instance, keyed by summoner, queue and scope: every viewer of the same widget shares one call budget
    private static readonly ConcurrentDictionary<string, CallState> States = new();

    private static CallState StateFor(string key, long now)
    {
        // Generator previews create a state for every summoner opened; idle ones are dropped so the map cannot grow forever
        if (States.Count >= MaxStates)
            foreach (var (k, s) in States)
                if (now - s.UsedAt >= StateIdleMs) States.TryRemove(k, out _);
        var state = States.GetOrAdd(key, _ => new CallState());
        state.UsedAt = now;
        return state;
    }

    /// <summary>The account behind a profile slug (Name-TAG) and its server host; null when Riot knows no such player.</summary>
    private async Task<Account?> FindAccountAsync(string slug, CancellationToken ct)
    {
        var decoded = Uri.UnescapeDataString(slug);
        var separator = decoded.LastIndexOf('-');
        if (separator <= 0 || separator == decoded.Length - 1) return null;
        var (gameName, tagLine) = (decoded[..separator], decoded[(separator + 1)..]);
        // A known account with a server skips the lookup, so a widget polling every minute costs no account calls
        var known = await db.Accounts.FirstOrDefaultAsync(a => a.GameName.ToLower() == gameName.ToLower() && a.TagLine.ToLower() == tagLine.ToLower() && a.Platform != null, ct);
        if (known is not null && Platforms.ByHost(known.Platform) is not null) return known;
        return (await accounts.LocateAsync(gameName, tagLine, null, ct))?.Account;
    }

    /// <summary>The widget's data, or null when the slug names no summoner on a tracked server.</summary>
    public async Task<WidgetData?> BuildAsync(string slug, WidgetQuery query, long now, CancellationToken ct = default)
    {
        if (await FindAccountAsync(slug, ct) is not { Platform: { } host } account || Platforms.ByHost(host) is not { } platform) return null;
        var puuid = account.Puuid;
        var (queueId, queueType) = QueueIds[query.Queue];
        var state = StateFor($"{puuid}:{query.Queue}:{(query.Season ? "season" : "session")}", now);

        await state.Gate.WaitAsync(ct);
        try
        {
            var limited = false;
            async Task<T?> Riot<T>(Func<Task<T?>> call) where T : class
            {
                if (limited) return null;
                try
                {
                    return await call();
                }
                catch (HttpRequestException e)
                {
                    if (e.StatusCode == HttpStatusCode.TooManyRequests) limited = true;
                    return null;
                }
            }

            // Ranked every minute like the original; entries are shared, so widgets of the same player reuse a fresh fetch
            var entry = (await ranked.GetAsync(account, ct, RankedEvery)).FirstOrDefault(e => e.QueueType == queueType);
            int? total = entry is null ? null : entry.Wins + entry.Losses;

            if (state.Ids is null || total != state.IdsTotal || now - state.IdsAt >= IdsEveryMs)
            {
                var ids = await Riot(() => query.Season
                    ? riot.GetMatchIdsFilteredAsync(puuid, SeasonGameCount, queueId, null, ct)
                    : riot.GetMatchIdsFilteredAsync(puuid, IdCount, queueId, (now - IdsLookbackMs) / 1000, ct));
                if (ids is not null)
                {
                    state.Ids = ids;
                    state.IdsAt = now;
                    state.IdsTotal = total;
                }
            }

            var current = state.Ids ?? [];
            var uncached = current.Where(id => !state.Matches.ContainsKey(id)).ToArray();
            if (uncached.Length > 0)
                foreach (var (id, match) in await MatchProjection.ByIdsAsync(db, uncached, puuid, [], ct))
                    state.Matches[id] = Own(match, puuid);
            foreach (var id in current.Where(id => !state.Matches.ContainsKey(id)).Take(MatchFetchCap).ToList())
            {
                if (await Riot<RiotMatch>(async () => await matches.GetMatchAsync(id, ct)) is { } fetched) state.Matches[id] = Own(fetched, puuid);
            }
            foreach (var id in state.Matches.Keys.Where(id => !current.Contains(id)).ToList()) state.Matches.Remove(id);

            var all = WidgetLogic.SessionGames(current.Select(id => state.Matches.GetValueOrDefault(id)).OfType<RiotMatch>(), puuid, queueId, query.Since ?? 0);
            var games = query.Season || query.Since is not null ? all : WidgetLogic.AutoSession(all, now, WidgetLogic.AutoSessionGapMs);
            var sessionWins = games.Count(g => g.Win);
            var record = query.Season
                ? new WidgetRecord(entry?.Wins ?? 0, entry?.Losses ?? 0)
                : new WidgetRecord(sessionWins, games.Count - sessionWins);

            int? lpChange = null;
            if (!query.Season && entry is not null && games.Count > 0)
            {
                var start = DateTimeOffset.FromUnixTimeMilliseconds(games[0].Start).UtcDateTime;
                var baseline = await db.LpSnapshots
                    .Where(s => s.Puuid == puuid && s.QueueType == queueType && s.CreatedAt < start)
                    .OrderByDescending(s => s.CreatedAt)
                    .FirstOrDefaultAsync(ct);
                lpChange = WidgetLogic.SessionLpChange(
                    baseline is null ? null : new LpPoint(baseline.Tier, baseline.Rank, baseline.Lp, baseline.Wins, baseline.Losses),
                    new LpPoint(entry.Tier, entry.Rank, entry.LeaguePoints, entry.Wins, entry.Losses), games);
            }

            if (query.Live && !limited && now - state.LiveAt >= LiveEveryMs)
            {
                state.LiveAt = now;
                try
                {
                    var live = await riot.GetActiveGameAsync(host, puuid, ct);
                    var championId = live?.Participants.FirstOrDefault(p => p.Puuid == puuid)?.ChampionId;
                    state.LiveChampion = championId is { } id ? (await dataDragon.GetAsync(ct)).ChampionIds.GetValueOrDefault(id) : null;
                    state.LiveStartedAt = live is { GameStartTime: > 0 } ? live.GameStartTime : null;
                }
                catch (HttpRequestException)
                {
                    // Riot failed: the last known live game stays until the next check
                }
            }

            return new WidgetData(
                account.GameName, account.TagLine, platform.Key,
                entry is null ? null : new WidgetRank(entry.Tier, entry.Rank, entry.LeaguePoints),
                query.Season ? "season" : "session",
                record,
                entry is null ? null : new WidgetRecord(entry.Wins, entry.Losses),
                games,
                lpChange,
                query.Live ? state.LiveChampion : null,
                query.Live ? state.LiveStartedAt : null);
        }
        finally
        {
            state.Gate.Release();
        }
    }

    private static RiotMatch Own(RiotMatch match, string puuid) =>
        match with { Info = match.Info with { Participants = match.Info.Participants.Where(p => p.Puuid == puuid).ToList() } };
}
