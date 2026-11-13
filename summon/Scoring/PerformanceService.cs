using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
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
    private const int RecentGames = 30;
    private const int TopChampions = 3;
    private static readonly int[] EligibleQueues = [420, 440, 710];

    /// <summary>
    /// Role baselines from the last 60 days of stored ranked games, kept for 10 minutes.
    /// </summary>
    // shortcut: rebuilt from every stored game on demand instead of a daily job and a table; move to a background job once the match table grows large
    public async Task<Dictionary<string, RoleBaseline>> GetBaselinesAsync(CancellationToken ct = default) =>
        (await cache.GetOrCreateAsync("performance-baselines", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10);
            var since = DateTimeOffset.UtcNow.AddDays(-WindowDays).ToUnixTimeMilliseconds();
            var json = await db.Matches
                .Where(m => EligibleQueues.Contains(m.QueueId) && m.GameDuration >= 300 && m.GameCreation >= since)
                .Select(m => m.Data)
                .ToListAsync(ct);
            return ScoreEngine.BuildBaselines(json.Select(j => JsonSerializer.Deserialize<RiotMatch>(j, JsonSerializerOptions.Web)!));
        }))!;

    /// <summary>The player's score in each match, by match id; matches without one are left out.</summary>
    public async Task<Dictionary<string, PerformanceScore>> ScoreAsync(IEnumerable<RiotMatch> matches, string puuid, CancellationToken ct = default)
    {
        var baselines = await GetBaselinesAsync(ct);
        var scores = new Dictionary<string, PerformanceScore>();
        foreach (var match in matches)
            if (ScoreEngine.Score(match, puuid, baselines) is { } score) scores[match.Metadata.MatchId] = score;
        return scores;
    }

    /// <summary>Summary of the player's last 30 stored ranked games: winrate, top champions, average score, MVP/ACE and category averages.</summary>
    public async Task<RecentSummary> RecentAsync(string puuid, CancellationToken ct = default)
    {
        var json = await db.MatchParticipants
            .Where(p => p.Puuid == puuid && EligibleQueues.Contains(p.Match.QueueId) && p.Match.GameDuration >= 300)
            .OrderByDescending(p => p.Match.GameCreation)
            .Take(RecentGames)
            .Select(p => p.Match.Data)
            .ToListAsync(ct);
        var matches = json.Select(j => JsonSerializer.Deserialize<RiotMatch>(j, JsonSerializerOptions.Web)!).ToList();
        var baselines = await GetBaselinesAsync(ct);

        var games = matches
            .Select(m => (Match: m, Player: m.Info.Participants.FirstOrDefault(p => p.Puuid == puuid), Scores: ScoreEngine.ScoreMatch(m, baselines)))
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
