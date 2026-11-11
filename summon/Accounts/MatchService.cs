using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using summon.Data;
using summon.Riot;


namespace summon.Accounts;

public record MatchRow(string MatchId, string ChampionName, bool Win, int Kills, int Deaths, int Assists, int Cs, int QueueId, long GameCreation, int GameDuration,
    int[] Items, int Spell1, int Spell2);

public class MatchService(SummonDbContext db, RiotClient riot)
{
    private const int Count = 20;

    public async Task<List<MatchRow>> GetRecentAsync(Account account, CancellationToken ct = default)
    {
        var ids = await riot.GetMatchIdsAsync(account.Puuid, Count, ct) ?? [];
        var known = await db.Matches.Where(m => ids.Contains(m.MatchId)).Select(m => m.MatchId).ToListAsync(ct);

        foreach(var id in ids.Except(known))
        {
            var json = await riot.GetMatchJsonAsync(id, ct);
            var info = JsonSerializer.Deserialize<RiotMatch>(json, JsonSerializerOptions.Web)!.Info;
            db.Matches.Add(new Match
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
                    Items = [p.Item0, p.Item1, p.Item2, p.Item3, p.Item4, p.Item5, p.Item6],
                    Spell1 = p.Summoner1Id,
                    Spell2 = p.Summoner2Id,
                }).ToList()
            });
        }

        await db.SaveChangesAsync(ct);

        return await db.MatchParticipants
            .Where(p => p.Puuid == account.Puuid)
            .OrderByDescending(p => p.Match.GameCreation)
            .Take(Count)
            .Select(p => new MatchRow(p.MatchId, p.ChampionName, p.Win, p.Kills, p.Deaths, p.Assists, p.Cs, p.Match.QueueId, p.Match.GameCreation, p.Match.GameDuration,
                p.Items, p.Spell1, p.Spell2))
            .ToListAsync(ct);
    }
}