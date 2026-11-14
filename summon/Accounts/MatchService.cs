using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using summon.Data;
using summon.Riot;


namespace summon.Accounts;

public record MatchRow(string MatchId, string ChampionName, bool Win, int Kills, int Deaths, int Assists, int Cs, int QueueId, long GameCreation, int GameDuration,
    int[] Items, int Spell1, int Spell2, int TeamKills, int ChampionLevel, int Keystone, int SecondaryStyle, int? Placement);

/// <summary>The overview's stored match documents, each list newest first.</summary>
public record ProfileMatches(List<RiotMatch> Recent, List<RiotMatch> Rift, List<RiotMatch> Ranked);

/// <summary>Per-champion totals over a player's stored games, remakes excluded.</summary>
public record ChampionStat(int ChampionId, string ChampionName, int Games, int Wins, double WinRate, double Kills, double Deaths, double Assists, double Kda, double CsPerMin, double AvgDamage);

/// <summary>One "Load more" page of games; HasMore is false once Riot returned a short page, Complete false when some games failed to download.</summary>
public record MatchPage(List<MatchRow> Rows, bool HasMore, bool Complete);

public class MatchService(SummonDbContext db, RiotClient riot)
{
    // The overview loads 50 games like the original: the list pages through them, the side panels read all of them
    private const int Count = 50;
    private const int FetchBatch = 5;
    private const int RecentRankedGames = 30;
    private static readonly int[] RankedQueues = [420, 440, 710];

    public async Task<List<MatchRow>> GetRecentAsync(Account account, CancellationToken ct = default)
    {
        List<string> ids;
        try
        {
            ids = await riot.GetMatchIdsAsync(account.Puuid, Count, ct: ct) ?? [];
        }
        catch (HttpRequestException)
        {
            // Riot down or rate limited: show the games already stored instead of failing the whole profile
            ids = [];
        }

        await StoreMissingAsync(ids, ct);
        return await ToRows(db.MatchParticipants.Where(p => p.Puuid == account.Puuid)).Take(Count).ToListAsync(ct);
    }

    /// <summary>The 50 games after <paramref name="start"/>, for "Load more" past the overview's first 50; null when Riot could not be reached.</summary>
    public async Task<MatchPage?> GetPageAsync(Account account, int start, CancellationToken ct = default)
    {
        List<string> ids;
        try
        {
            ids = await riot.GetMatchIdsAsync(account.Puuid, Count, start, ct) ?? [];
        }
        catch (HttpRequestException)
        {
            return null;
        }

        var failed = await StoreMissingAsync(ids, ct);
        var rows = await ToRows(db.MatchParticipants.Where(p => p.Puuid == account.Puuid && ids.Contains(p.MatchId))).ToListAsync(ct);
        return new MatchPage(rows, ids.Count == Count, failed == 0);
    }

    /// <summary>Downloads and stores the matches among <paramref name="ids"/> that are not stored yet, five at a time; returns how many failed.</summary>
    private async Task<int> StoreMissingAsync(List<string> ids, CancellationToken ct)
    {
        var failed = 0;
        var known = await db.Matches.Where(m => ids.Contains(m.MatchId)).Select(m => m.MatchId).ToListAsync(ct);

        foreach (var batch in ids.Except(known).Chunk(FetchBatch))
        {
            // Riot calls run in parallel; the DbContext is not thread safe, so the entities are added one by one afterwards
            var fetched = await Task.WhenAll(batch.Select(async id =>
            {
                try
                {
                    return (Id: id, Json: await riot.GetMatchJsonAsync(id, ct));
                }
                catch (HttpRequestException)
                {
                    // A game that failed now is fetched on the next load
                    return (Id: id, Json: (string?)null);
                }
            }));
            foreach (var (id, json) in fetched)
            {
                if (json is null) failed++;
                else db.Matches.Add(ToEntity(id, json));
            }
        }

        await db.SaveChangesAsync(ct);
        return failed;
    }

    /// <summary>Match rows for the given participant rows, newest first.</summary>
    private static IQueryable<MatchRow> ToRows(IQueryable<MatchParticipant> participants) => participants
        .OrderByDescending(p => p.Match.GameCreation)
        // Teammates share the win flag, so it stands in for the team id we do not store
        .Select(p => new MatchRow(p.MatchId, p.ChampionName, p.Win, p.Kills, p.Deaths, p.Assists, p.Cs, p.Match.QueueId, p.Match.GameCreation, p.Match.GameDuration,
            p.Items, p.Spell1, p.Spell2, p.Match.Participants.Where(o => o.Win == p.Win).Sum(o => o.Kills), p.ChampLevel, p.Keystone, p.SecondaryStyle, p.Placement));

    /// <summary>
    /// The stored matches the overview reads: the newest 50, the newest 50 on Summoner's Rift and the newest 30 scorable ranked games.
    /// The three sets overlap, so their ids are picked from a light query and each match document is loaded once.
    /// </summary>
    public async Task<ProfileMatches> GetProfileMatchesAsync(string puuid, CancellationToken ct = default)
    {
        var games = await db.MatchParticipants
            .Where(p => p.Puuid == puuid)
            .OrderByDescending(p => p.Match.GameCreation)
            .Select(p => new { p.MatchId, p.Match.QueueId, p.Match.GameDuration })
            .ToListAsync(ct);

        var recent = games.Take(Count).Select(g => g.MatchId).ToList();
        var rift = games.Where(g => Queues.RiftIds.Contains(g.QueueId)).Take(Count).Select(g => g.MatchId).ToList();
        var ranked = games.Where(g => RankedQueues.Contains(g.QueueId) && !Queues.IsRemake(g.GameDuration)).Take(RecentRankedGames).Select(g => g.MatchId).ToList();
        var ids = recent.Concat(rift).Concat(ranked).Distinct().ToArray();
        // The Rift panel reads only the player's own participant, so Rift-only games drop the other nine
        var ownOnly = rift.Except(recent).Except(ranked).ToArray();
        var byId = await MatchProjection.ByIdsAsync(db, ids, puuid, ownOnly, ct);

        List<RiotMatch> Pick(List<string> list) => list.Where(byId.ContainsKey).Select(id => byId[id]).ToList();
        return new ProfileMatches(Pick(recent), Pick(rift), Pick(ranked));
    }

    /// <summary>Match documents by id, trimmed like the overview's, for the games "Load more" adds.</summary>
    public Task<Dictionary<string, RiotMatch>> GetDocumentsAsync(string puuid, string[] ids, CancellationToken ct = default) =>
        MatchProjection.ByIdsAsync(db, ids, puuid, [], ct);

    /// <summary>Start time and result of the player's stored ranked games (Solo, Flex, 5s; remakes excluded) since the given time.</summary>
    public async Task<List<(long GameCreation, bool Win)>> GetRankedResultsAsync(string puuid, long sinceMs, CancellationToken ct = default) =>
        (await db.MatchParticipants
            .Where(p => p.Puuid == puuid && RankedQueues.Contains(p.Match.QueueId) && p.Match.GameDuration >= 300 && p.Match.GameCreation >= sinceMs)
            .Select(p => new { p.Match.GameCreation, p.Win })
            .ToListAsync(ct))
        .Select(r => (r.GameCreation, r.Win))
        .ToList();

    private sealed class ChampionTotals
    {
        public int ChampionId { get; set; }
        public string ChampionName { get; set; } = "";
        public int Games { get; set; }
        public int Wins { get; set; }
        public int Kills { get; set; }
        public int Deaths { get; set; }
        public int Assists { get; set; }
        public int Cs { get; set; }
        public long Damage { get; set; }
        public int DurationSeconds { get; set; }
    }

    /// <summary>
    /// Per-champion totals over the player's stored games, remakes excluded, like the original's stats query: damage and the
    /// champion id are only in the match documents, so the player's participant is read from the JSON.
    /// </summary>
    public async Task<List<ChampionStat>> GetChampionStatsAsync(string puuid, string queueFilter, CancellationToken ct = default)
    {
        var (include, ids) = Queues.Selection(queueFilter);
        // The condition is picked from two fixed strings, never built from input
        var queueCondition = include ? """m."QueueId" = ANY(@ids)""" : """NOT (m."QueueId" = ANY(@ids))""";
        var rows = await db.Database.SqlQueryRaw<ChampionTotals>($"""
            SELECT
                (p->>'championId')::int AS "ChampionId",
                p->>'championName' AS "ChampionName",
                COUNT(*)::int AS "Games",
                (COUNT(*) FILTER (WHERE (p->>'win')::boolean))::int AS "Wins",
                SUM((p->>'kills')::int)::int AS "Kills",
                SUM((p->>'deaths')::int)::int AS "Deaths",
                SUM((p->>'assists')::int)::int AS "Assists",
                SUM((p->>'totalMinionsKilled')::int + (p->>'neutralMinionsKilled')::int)::int AS "Cs",
                SUM((p->>'totalDamageDealtToChampions')::bigint)::bigint AS "Damage",
                SUM(m."GameDuration")::int AS "DurationSeconds"
            FROM "MatchParticipants" mp
            JOIN "Matches" m ON m."MatchId" = mp."MatchId"
            CROSS JOIN LATERAL jsonb_array_elements(m."Data"->'info'->'participants') AS p
            WHERE mp."Puuid" = @puuid AND p->>'puuid' = @puuid AND m."GameDuration" >= 300 AND {queueCondition}
            GROUP BY 1, 2
            ORDER BY "Games" DESC, "Wins" DESC
            """, new NpgsqlParameter("puuid", puuid), new NpgsqlParameter("ids", ids)).ToListAsync(ct);

        static double Round2(double value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
        return rows.Select(r =>
        {
            var minutes = r.DurationSeconds / 60.0;
            return new ChampionStat(
                r.ChampionId,
                r.ChampionName,
                r.Games,
                r.Wins,
                Round2(100.0 * r.Wins / r.Games),
                Round2((double)r.Kills / r.Games),
                Round2((double)r.Deaths / r.Games),
                Round2((double)r.Assists / r.Games),
                // A deathless champion's KDA is its kills plus assists, as in the original
                Round2(r.Deaths > 0 ? (double)(r.Kills + r.Assists) / r.Deaths : r.Kills + r.Assists),
                minutes > 0 ? Round2(r.Cs / minutes) : 0,
                Round2((double)r.Damage / r.Games));
        }).ToList();
    }

    /// <summary>The player's newest stored games on one champion (case-insensitive name), for the champion sub-page.</summary>
    public Task<List<MatchRow>> GetChampionRowsAsync(string puuid, string championName, CancellationToken ct = default) =>
        ToRows(db.MatchParticipants.Where(p => p.Puuid == puuid && p.ChampionName.ToLower() == championName.ToLower())).Take(Count).ToListAsync(ct);

    public async Task<RiotMatch> GetMatchAsync(string matchId, CancellationToken ct = default)
    {
        var json = await db.Matches.Where(m => m.MatchId == matchId).Select(m => m.Data).FirstOrDefaultAsync(ct);
        if (json is null)
        {
            json = await riot.GetMatchJsonAsync(matchId, ct);
            db.Matches.Add(ToEntity(matchId, json));
            await db.SaveChangesAsync(ct);
        }

        return JsonSerializer.Deserialize<RiotMatch>(json, JsonSerializerOptions.Web)!;
    }

    private static Match ToEntity(string id, string json)
    {
        var info = JsonSerializer.Deserialize<RiotMatch>(json, JsonSerializerOptions.Web)!.Info;
        return new Match
        {
            MatchId = id,
            QueueId = info.QueueId,
            GameCreation = info.GameCreation,
            GameDuration = info.GameDuration,
            Data = json,
            // Bot games give every bot the same puuid, which would break the (MatchId, Puuid) key
            Participants = info.Participants.DistinctBy(p => p.Puuid).Select(p => new MatchParticipant
            {
                MatchId = id,
                Puuid = p.Puuid,
                ChampionName = p.ChampionName,
                Win = p.Win,
                Kills = p.Kills,
                Deaths = p.Deaths,
                Assists = p.Assists,
                Cs = p.TotalMinionsKilled + p.NeutralMinionsKilled,
                ChampLevel = p.ChampLevel,
                Keystone = p.Keystone,
                SecondaryStyle = p.SecondaryStyle,
                Placement = p.Placement,
                Items = [p.Item0, p.Item1, p.Item2, p.Item3, p.Item4, p.Item5, p.Item6],
                Spell1 = p.Summoner1Id,
                Spell2 = p.Summoner2Id,
            }).ToList()
        };
    }
}