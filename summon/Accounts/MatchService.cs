using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using summon.Data;
using summon.Riot;


namespace summon.Accounts;

public record MatchRow(string MatchId, string ChampionName, bool Win, int Kills, int Deaths, int Assists, int Cs, int QueueId, long GameCreation, int GameDuration,
    int[] Items, int Spell1, int Spell2, int TeamKills, int ChampionLevel, int Keystone, int SecondaryStyle, int? Placement);

/// <summary>Per-champion totals over a player's stored games, remakes excluded.</summary>
public record ChampionStat(string ChampionName, int Games, int Wins, double WinRate, double Kda);

public class MatchService(SummonDbContext db, RiotClient riot)
{
    // The overview loads 50 games like the original: the list pages through them, the side panels read all of them
    private const int Count = 50;

    public async Task<List<MatchRow>> GetRecentAsync(Account account, CancellationToken ct = default)
    {
        var ids = await riot.GetMatchIdsAsync(account.Puuid, Count, ct) ?? [];
        var known = await db.Matches.Where(m => ids.Contains(m.MatchId)).Select(m => m.MatchId).ToListAsync(ct);

        foreach (var id in ids.Except(known))
            db.Matches.Add(ToEntity(id, await riot.GetMatchJsonAsync(id, ct)));

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

    /// <summary>The player's newest stored matches, optionally only from some queues, newest first.</summary>
    public async Task<List<RiotMatch>> GetStoredMatchesAsync(string puuid, int take, int[]? queueIds = null, CancellationToken ct = default)
    {
        var query = db.MatchParticipants.Where(p => p.Puuid == puuid);
        if (queueIds is not null) query = query.Where(p => queueIds.Contains(p.Match.QueueId));
        var json = await query.OrderByDescending(p => p.Match.GameCreation).Take(take).Select(p => p.Match.Data).ToListAsync(ct);
        return json.Select(j => JsonSerializer.Deserialize<RiotMatch>(j, JsonSerializerOptions.Web)!).ToList();
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