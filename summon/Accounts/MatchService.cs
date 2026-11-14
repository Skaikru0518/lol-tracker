using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using summon.Data;
using summon.Riot;


namespace summon.Accounts;

public record MatchRow(string MatchId, string ChampionName, bool Win, int Kills, int Deaths, int Assists, int Cs, int QueueId, long GameCreation, int GameDuration,
    int[] Items, int Spell1, int Spell2, int TeamKills, int ChampionLevel, int Keystone, int SecondaryStyle, int? Placement);

/// <summary>The overview's stored match documents, each list newest first.</summary>
public record ProfileMatches(List<RiotMatch> Recent, List<RiotMatch> Rift, List<RiotMatch> Ranked);

/// <summary>Per-champion totals over a player's stored games, remakes excluded.</summary>
public record ChampionStat(string ChampionName, int Games, int Wins, double WinRate, double Kda);

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
            ids = await riot.GetMatchIdsAsync(account.Puuid, Count, ct) ?? [];
        }
        catch (HttpRequestException)
        {
            // Riot down or rate limited: show the games already stored instead of failing the whole profile
            ids = [];
        }
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
                if (json is not null) db.Matches.Add(ToEntity(id, json));
        }

        await db.SaveChangesAsync(ct);

        return await db.MatchParticipants
            .Where(p => p.Puuid == account.Puuid)
            .OrderByDescending(p => p.Match.GameCreation)
            .Take(Count)
            // Teammates share the win flag, so it stands in for the team id we do not store
            .Select(p => new MatchRow(p.MatchId, p.ChampionName, p.Win, p.Kills, p.Deaths, p.Assists, p.Cs, p.Match.QueueId, p.Match.GameCreation, p.Match.GameDuration,
                p.Items, p.Spell1, p.Spell2, p.Match.Participants.Where(o => o.Win == p.Win).Sum(o => o.Kills), p.ChampLevel, p.Keystone, p.SecondaryStyle, p.Placement))
            .ToListAsync(ct);
    }

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

    public async Task<List<ChampionStat>> GetChampionStatsAsync(string puuid, string queueFilter, CancellationToken ct = default)
    {
        var (include, ids) = Queues.Selection(queueFilter);
        var query = db.MatchParticipants.Where(p => p.Puuid == puuid && p.Match.GameDuration >= 300);
        query = include ? query.Where(p => ids.Contains(p.Match.QueueId)) : query.Where(p => !ids.Contains(p.Match.QueueId));

        var rows = await query
            .GroupBy(p => p.ChampionName)
            .Select(g => new
            {
                ChampionName = g.Key,
                Games = g.Count(),
                Wins = g.Count(p => p.Win),
                Kills = g.Sum(p => p.Kills),
                Deaths = g.Sum(p => p.Deaths),
                Assists = g.Sum(p => p.Assists),
            })
            .OrderByDescending(r => r.Games).ThenByDescending(r => r.Wins)
            .ToListAsync(ct);

        return rows.Select(r => new ChampionStat(
            r.ChampionName,
            r.Games,
            r.Wins,
            Math.Round(100.0 * r.Wins / r.Games, 2),
            Math.Round(r.Deaths > 0 ? (double)(r.Kills + r.Assists) / r.Deaths : r.Kills + r.Assists, 2))).ToList();
    }

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