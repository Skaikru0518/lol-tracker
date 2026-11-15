using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Npgsql;
using summon.Accounts;
using summon.Data;
using summon.Riot;

namespace summon.Scoring;

public record ChampionSummary(string ChampionName, int Games, int Wins, int WinRate, double Kda);

public record CategorySummary(string Id, int Score, string Grade);

public record RecentSummary(
    int Games,
    int Wins,
    int Losses,
    int WinRate,
    List<ChampionSummary> Champions,
    int ScoredGames,
    (int Average, string Grade)? Score,
    int Mvp,
    int Ace,
    List<CategorySummary> Categories);

public class PerformanceService(SummonDbContext db, IMemoryCache cache)
{
    private const int WindowDays = 60;
    private const int TopChampions = 3;
    // A match's scores are stored only when every role in it was scored against at least this many calibrated games
    private const int MinCacheGames = 100;
    private const int FullLobby = 10;

    /// <summary>
    /// Role baselines from the last 60 days of stored ranked games, kept for 10 minutes.
    /// </summary>
    // shortcut: rebuilt from every stored game on demand instead of a daily job and a table; move to a background job once the match table grows large
    public async Task<Dictionary<string, RoleBaseline>> GetBaselinesAsync(CancellationToken ct = default) =>
        (await cache.GetOrCreateAsync("performance-baselines", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10);
            var since = DateTimeOffset.UtcNow.AddDays(-WindowDays).ToUnixTimeMilliseconds();
            return ScoreEngine.BuildBaselines((await MatchProjection.RankedSinceAsync(db, since, ct)).Values);
        }))!;

    /// <summary>The player's score in each match, by match id; matches without one are left out.</summary>
    public async Task<Dictionary<string, PerformanceScore>> ScoreAsync(IEnumerable<RiotMatch> matches, string puuid, CancellationToken ct = default) =>
        (await ScoresAsync(matches, ct))
            .Where(m => m.Value.ContainsKey(puuid))
            .ToDictionary(m => m.Key, m => m.Value[puuid]);

    /// <summary>Every scored player's score in one match, by puuid; empty when the match or its roles cannot be scored.</summary>
    public async Task<Dictionary<string, PerformanceScore>> ScoreMatchAsync(RiotMatch match, CancellationToken ct = default) =>
        (await ScoresAsync([match], ct)).GetValueOrDefault(match.Metadata.MatchId) ?? [];

    /// <summary>
    /// Every scored player's score per match, like the original's scoreAndCache: stored scores are read back, the rest are
    /// scored now and stored when they can be kept (finished games never change).
    /// </summary>
    private async Task<Dictionary<string, Dictionary<string, PerformanceScore>>> ScoresAsync(IEnumerable<RiotMatch> matches, CancellationToken ct)
    {
        var list = matches.DistinctBy(m => m.Metadata.MatchId).ToList();
        var ids = list.Select(m => m.Metadata.MatchId).ToArray();
        var result = (await db.MatchPerformances.AsNoTracking().Where(p => ids.Contains(p.MatchId)).Select(p => new { p.MatchId, p.Data }).ToListAsync(ct))
            .ToDictionary(p => p.MatchId, p => JsonSerializer.Deserialize<Dictionary<string, PerformanceScore>>(p.Data, JsonSerializerOptions.Web) ?? []);

        var missing = list.Where(m => !result.ContainsKey(m.Metadata.MatchId)).ToList();
        if (missing.Count == 0) return result;
        var baselines = await GetBaselinesAsync(ct);
        foreach (var match in missing)
        {
            var scores = ScoreEngine.ScoreMatch(match, baselines);
            result[match.Metadata.MatchId] = scores;
            if (scores.Count > 0 && Cacheable(match, baselines)) await StoreAsync(match.Metadata.MatchId, scores, ct);
        }
        return result;
    }

    // Scores move while a role's baseline is small or uncalibrated, so only matches scored against settled baselines are kept.
    // A document trimmed to one player is never kept, since the others' scores would be missing.
    private static bool Cacheable(RiotMatch match, IReadOnlyDictionary<string, RoleBaseline> baselines) =>
        ScoreEngine.IsEligible(match.Info.QueueId, match.Info.GameDuration)
        && match.Info.Participants.Count >= FullLobby
        && match.Info.Participants
            .Where(p => Weights.Roles.Contains(p.TeamPosition))
            .All(p => baselines.TryGetValue(p.TeamPosition, out var b) && b.Calibration is not null && b.Games >= MinCacheGames);

    private Task StoreAsync(string matchId, Dictionary<string, PerformanceScore> scores, CancellationToken ct) =>
        db.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO "MatchPerformances" ("MatchId", "Data", "Summary") VALUES (@id, @data::jsonb, @summary::jsonb)
            ON CONFLICT ("MatchId") DO NOTHING
            """,
            [
                new NpgsqlParameter("id", matchId),
                new NpgsqlParameter("data", JsonSerializer.Serialize(scores, JsonSerializerOptions.Web)),
                // The score and grade alone, like the original's summary column the match list reads
                new NpgsqlParameter("summary", JsonSerializer.Serialize(scores.ToDictionary(s => s.Key, s => new { score = s.Value.Score, grade = s.Value.Grade }), JsonSerializerOptions.Web)),
            ], ct);

    /// <summary>Summary of the player's last 30 stored ranked games: winrate, top champions, average score, MVP/ACE and category averages.</summary>
    public async Task<RecentSummary> RecentAsync(IReadOnlyList<RiotMatch> matches, string puuid, CancellationToken ct = default)
    {
        var stored = await ScoresAsync(matches, ct);

        var games = matches
            .Select(m => (Match: m, Player: m.Info.Participants.FirstOrDefault(p => p.Puuid == puuid), Scores: stored.GetValueOrDefault(m.Metadata.MatchId) ?? []))
            .Where(g => g.Player is not null)
            .ToList();
        var wins = games.Count(g => g.Player!.Win);

        var champions = games
            .GroupBy(g => g.Player!.ChampionName)
            .Select(c =>
            {
                var won = c.Count(g => g.Player!.Win);
                var kda = (double)(c.Sum(g => g.Player!.Kills) + c.Sum(g => g.Player!.Assists)) / Math.Max(c.Sum(g => g.Player!.Deaths), 1);
                return new ChampionSummary(c.Key, c.Count(), won, ScoreEngine.JsRound(100.0 * won / c.Count()), Math.Floor(kda * 100 + 0.5) / 100);
            })
            .OrderByDescending(c => c.Games).ThenByDescending(c => c.Wins)
            .Take(TopChampions)
            .ToList();

        var scored = games.Where(g => g.Scores.ContainsKey(puuid)).ToList();
        var average = scored.Count == 0 ? 0 : ScoreEngine.JsRound(scored.Average(g => g.Scores[puuid].Score));

        // MVP: the best score on the winning team; ACE: the best on the losing team
        var mvp = 0;
        var ace = 0;
        foreach (var g in scored)
        {
            var mine = g.Scores[puuid].Score;
            var team = g.Match.Info.Participants
                .Where(p => p.TeamId == g.Player!.TeamId && g.Scores.ContainsKey(p.Puuid))
                .Select(p => g.Scores[p.Puuid].Score)
                .ToList();
            if (team.Count == 0 || mine < team.Max()) continue;
            if (g.Player!.Win) mvp++;
            else ace++;
        }

        var categories = Weights.Categories
            .Select(id => (Id: id, Values: scored.SelectMany(g => g.Scores[puuid].Categories.Where(c => c.Id == id).Select(c => c.Score)).ToList()))
            .Where(c => c.Values.Count > 0)
            .Select(c =>
            {
                var score = ScoreEngine.JsRound(c.Values.Average());
                return new CategorySummary(c.Id, score, Grades.For(score));
            })
            .ToList();

        return new RecentSummary(
            games.Count,
            wins,
            games.Count - wins,
            games.Count == 0 ? 0 : ScoreEngine.JsRound(100.0 * wins / games.Count),
            champions,
            scored.Count,
            scored.Count == 0 ? null : (average, Grades.For(average)),
            mvp,
            ace,
            categories);
    }
}
