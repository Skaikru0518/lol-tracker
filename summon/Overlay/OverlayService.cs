using System.Collections.Concurrent;
using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using summon.Accounts;
using summon.Data;
using summon.Riot;

namespace summon.Overlay;

public record OverlayPlayer(
    string Puuid,
    string GameName,
    string TagLine,
    int TeamId,
    int ChampionId,
    bool IsSelf,
    string? Role,
    OverlayRank? Rank,
    List<int> Mains,
    OverlayToday? Today,
    List<string> Tags,
    List<string> Unavailable);

public record OverlayGame(bool InGame, long GameId, int QueueId, string Platform, long GameStartTime, List<OverlayPlayer> Players);

/// <summary>
/// The original's /api/overlay/game: the live lobby of a player as cards (rank, top 3 masteries, today's record in this
/// queue, main role, tags), cached for a minute for every player in the game.
/// </summary>
public class OverlayService(SummonDbContext db, RiotClient riot, AccountService accounts, RankedService ranked, MatchService matchService)
{
    private static readonly TimeSpan CacheTime = TimeSpan.FromMinutes(1);
    private const int MatchFetchCap = 30;
    private const int TodayIdCount = 20;
    private const int RecentMatches = 20;
    private static readonly int[] RiftQueues = [400, 420, 430, 440, 490];
    private static readonly ConcurrentDictionary<string, (OverlayGame Value, DateTime Expires)> Cache = new();

    private sealed class Draft(RiotLiveParticipant participant)
    {
        public RiotLiveParticipant Participant { get; } = participant;
        public bool Real => !string.IsNullOrEmpty(Participant.RiotId) && !string.IsNullOrEmpty(Participant.Puuid);
        public string? Role;
        public OverlayRank? Rank;
        public List<int> Mains = [];
        public OverlayToday? Today;
        public List<string> Tags = [];
        public List<string>? TodayIds;
        public readonly List<string> Unavailable = [];
    }

    /// <summary>The game, or null when the player is not in one; throws HttpRequestException(404) when the Riot ID does not exist.</summary>
    public async Task<OverlayGame?> BuildAsync(string gameName, string tagLine, Platforms.Platform platform, long since, CancellationToken ct = default)
    {
        var self = await accounts.AccountAsync(gameName, tagLine, ct) ?? throw new HttpRequestException("Account not found", null, HttpStatusCode.NotFound);
        var now = DateTime.UtcNow;
        if (Cache.TryGetValue(self.Puuid, out var hit) && hit.Expires > now)
            return hit.Value with { Players = hit.Value.Players.Select(p => p with { IsSelf = p.Puuid == self.Puuid }).ToList() };

        var live = await riot.GetActiveGameAsync(platform.Host, self.Puuid, ct);
        if (live is null) return null;
        var queueId = live.GameQueueConfigId;
        var limited = false;

        var drafts = live.Participants.Select(p => new Draft(p)).ToList();
        foreach (var draft in drafts.Where(d => !d.Real)) draft.Unavailable.AddRange(["rank", "mains", "today"]);
        var real = drafts.Where(d => d.Real).ToList();
        var puuids = real.Select(d => d.Participant.Puuid).ToList();

        // Database work runs one step at a time (the context is not thread safe); Riot calls per player run in parallel below
        foreach (var draft in real) await TrackAccountAsync(draft.Participant, platform.Host, ct);
        var entries = await ranked.GetBatchAsync(platform.Host, puuids, ct);
        var achievements = (await db.PlayerAchievements.AsNoTracking().Where(a => puuids.Contains(a.Puuid)).Select(a => new { a.Puuid, a.AchievementId }).ToListAsync(ct))
            .ToLookup(a => a.Puuid, a => a.AchievementId);
        foreach (var draft in real)
        {
            var puuid = draft.Participant.Puuid;
            draft.Rank = OverlayCards.Rank(entries.GetValueOrDefault(puuid) ?? [], queueId);
            draft.Tags = OverlayCards.OverlayTags(achievements[puuid]);
            draft.Role = OverlayCards.MainRole(await PositionCountsAsync(puuid, ct));
        }

        await Task.WhenAll(real.Select(async draft =>
        {
            var puuid = draft.Participant.Puuid;
            var mains = Section(draft, "mains", () => riot.GetTopMasteriesAsync(platform.Host, puuid, 3, ct));
            var ids = queueId > 0 ? Section(draft, "today", () => riot.GetMatchIdsFilteredAsync(puuid, TodayIdCount, queueId, since / 1000, ct)) : Task.FromResult<List<string>?>(null);
            draft.Mains = (await mains)?.Take(3).Select(m => m.ChampionId).ToList() ?? [];
            draft.TodayIds = await ids;
        }));

        var allIds = drafts.SelectMany(d => d.TodayIds ?? []).Distinct().ToArray();
        var matches = allIds.Length == 0 ? [] : (await db.Matches.AsNoTracking().Where(m => allIds.Contains(m.MatchId)).Select(m => new { m.MatchId, m.Data }).ToListAsync(ct))
            .ToDictionary(m => m.MatchId, m => JsonSerializer.Deserialize<RiotMatch>(m.Data, JsonSerializerOptions.Web)!);

        var missing = drafts.Select(d => (IReadOnlyList<string>)(d.TodayIds ?? []).Where(id => !matches.ContainsKey(id)).ToList()).ToList();
        var (fetch, partial) = OverlayCards.AllocateMatchFetches(missing, MatchFetchCap);
        foreach (var id in fetch)
        {
            if (limited) break;
            try
            {
                matches[id] = await matchService.GetMatchAsync(id, ct);
            }
            catch (HttpRequestException e)
            {
                if (e.StatusCode == HttpStatusCode.TooManyRequests) limited = true;
            }
        }

        for (var i = 0; i < drafts.Count; i++)
        {
            var draft = drafts[i];
            if (draft.TodayIds is null) continue;
            if (missing[i].Any(id => fetch.Contains(id) && !matches.ContainsKey(id)))
            {
                draft.Unavailable.Add("today");
                continue;
            }
            var (wins, losses) = OverlayCards.TodayRecord(draft.TodayIds.Where(matches.ContainsKey).Select(id => matches[id]), draft.Participant.Puuid, since, queueId);
            draft.Today = new OverlayToday(wins, losses, partial[i]);
        }

        var value = new OverlayGame(true, live.GameId, queueId, platform.Key, live.GameStartTime, drafts.Select(d =>
        {
            var (name, tag) = OverlayCards.SplitRiotId(d.Participant.RiotId ?? "");
            return new OverlayPlayer(d.Participant.Puuid ?? "", name, tag, d.Participant.TeamId, d.Participant.ChampionId, d.Participant.Puuid == self.Puuid,
                d.Role, d.Rank, d.Mains, d.Today, d.Tags, d.Unavailable);
        }).ToList());

        // Keys of other players are never overwritten, so expired games would stay in memory
        foreach (var (key, entry) in Cache)
            if (entry.Expires <= now) Cache.TryRemove(key, out _);
        foreach (var puuid in puuids) Cache[puuid] = (value, now + CacheTime);
        return value;

        // A Riot error leaves the section empty and marked unavailable instead of failing the whole lobby
        async Task<T?> Section<T>(Draft draft, string name, Func<Task<T?>> load) where T : class
        {
            try
            {
                return await load();
            }
            catch (HttpRequestException e)
            {
                if (e.StatusCode == HttpStatusCode.TooManyRequests) limited = true;
                lock (draft.Unavailable) draft.Unavailable.Add(name);
                return null;
            }
        }
    }

    /// <summary>Stores the lobby player's Riot ID; a player seen on another server moves there, dropping the old server's ranked and mastery rows.</summary>
    private async Task TrackAccountAsync(RiotLiveParticipant participant, string host, CancellationToken ct)
    {
        var (gameName, tagLine) = OverlayCards.SplitRiotId(participant.RiotId);
        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Puuid == participant.Puuid, ct);
        if (account is null)
        {
            db.Accounts.Add(new Account { Puuid = participant.Puuid, GameName = gameName, TagLine = tagLine, Platform = host, UpdatedAt = DateTime.UtcNow });
        }
        else
        {
            account.GameName = gameName;
            account.TagLine = tagLine;
            if (!string.Equals(account.Platform, host, StringComparison.OrdinalIgnoreCase))
            {
                if (Platforms.ByHost(account.Platform) is not null)
                {
                    await db.RankedEntries.Where(e => e.Puuid == account.Puuid).ExecuteDeleteAsync(ct);
                    await db.ChampionMasteries.Where(m => m.Puuid == account.Puuid).ExecuteDeleteAsync(ct);
                }
                account.Platform = host;
            }
        }
        await db.SaveChangesAsync(ct);
    }

    /// <summary>How often the player played each position in their last 20 stored Rift games.</summary>
    private async Task<List<(string Position, int Games)>> PositionCountsAsync(string puuid, CancellationToken ct) =>
        (await db.Database.SqlQueryRaw<PositionCount>(
            """
            SELECT p->>'teamPosition' AS "Position", count(*)::int AS "Games"
            FROM (
                SELECT m."Data" FROM "Matches" m
                JOIN "MatchParticipants" mp ON mp."MatchId" = m."MatchId"
                WHERE mp."Puuid" = {0} AND m."QueueId" = ANY({1})
                ORDER BY m."GameCreation" DESC
                LIMIT {2}
            ) m, jsonb_array_elements(m."Data"->'info'->'participants') p
            WHERE p->>'puuid' = {0}
            GROUP BY 1
            """, puuid, RiftQueues, RecentMatches).ToListAsync(ct))
        .Select(r => (r.Position ?? "", r.Games)).ToList();

    private record PositionCount(string? Position, int Games);
}
