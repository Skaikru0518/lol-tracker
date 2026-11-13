using summon.Data;
using summon.Riot;

namespace summon.Accounts;

/// <summary>LP change per game, read from the LP snapshots taken around the games.</summary>
public static class LpEstimate
{
    private static readonly string[] Tiers = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
    private static readonly string[] Divisions = ["IV", "III", "II", "I"];
    private const int ApexIndex = 7;

    private record Game(string Id, long End, bool Win);

    private record Gap(long At, int Delta, List<Game> Games);

    /// <summary>Rank as one LP number: 400 per tier, 100 per division; Master+ share one ladder above Diamond I.</summary>
    public static int ToAbsolute(string tier, string rank, int lp)
    {
        var tierIndex = Array.IndexOf(Tiers, tier);
        if (tierIndex == -1) return 0;
        if (tierIndex >= ApexIndex) return ApexIndex * 400 + lp;
        return tierIndex * 400 + Math.Max(Array.IndexOf(Divisions, rank), 0) * 100 + lp;
    }

    /// <summary>LP change per match id for the ranked games among the rows; games without a usable snapshot gap are left out.</summary>
    public static Dictionary<string, int> ForRows(IEnumerable<MatchRow> rows, IReadOnlyDictionary<string, List<LpSnapshot>> history)
    {
        var changes = new Dictionary<string, int>();
        var list = rows.ToList();
        foreach (var queueType in Ranks.QueueTypes)
        {
            // Remakes move no LP, like the original's achievement eligibility rule
            var games = list
                .Where(r => Ranks.QueueForQueueId(r.QueueId) == queueType && !Queues.IsRemake(r.GameDuration))
                .Select(r => new Game(r.MatchId, r.GameCreation + r.GameDuration * 1000L, r.Win))
                .ToList();
            foreach (var (id, lp) in Changes(history.GetValueOrDefault(queueType), games)) changes[id] = lp;
        }
        return changes;
    }

    private static List<Gap> Gaps(List<LpSnapshot> snapshots, List<Game> games)
    {
        var sorted = snapshots.OrderBy(s => s.CreatedAt).ToList();
        var gaps = new List<Gap>();
        for (var i = 1; i < sorted.Count; i++)
        {
            var before = sorted[i - 1];
            var after = sorted[i];
            var from = new DateTimeOffset(before.CreatedAt).ToUnixTimeMilliseconds();
            var to = new DateTimeOffset(after.CreatedAt).ToUnixTimeMilliseconds();
            var inGap = games.Where(g => g.End >= from && g.End < to).ToList();
            if (inGap.Count == 0) continue;
            // A gap whose W/L counters disagree with the stored games has games we don't know about
            if (before.Wins is { } bw && before.Losses is { } bl && after.Wins is { } aw && after.Losses is { } al && aw + al - (bw + bl) != inGap.Count) continue;
            gaps.Add(new Gap(to, ToAbsolute(after.Tier, after.Rank, after.Lp) - ToAbsolute(before.Tier, before.Rank, before.Lp), inGap));
        }
        return gaps;
    }

    // Math.round from JavaScript, which rounds halves up (-2.5 to -2), unlike any MidpointRounding mode
    private static int JsRound(double value) => (int)Math.Floor(value + 0.5);

    /// <summary>Gaps with several games are split using the player's nearest exactly known win gain.</summary>
    private static Dictionary<string, int> Changes(List<LpSnapshot>? snapshots, List<Game> games)
    {
        var changes = new Dictionary<string, int>();
        if (snapshots is null || snapshots.Count < 2) return changes;
        var all = Gaps(snapshots, games);
        var exactWins = all.Where(g => g.Games.Count == 1 && g.Games[0].Win).ToList();

        foreach (var (at, delta, inGap) in all)
        {
            // LP gains drift with MMR, so the closest exact win says the most about this session
            var nearest = exactWins.OrderBy(g => Math.Abs(g.At - at)).FirstOrDefault();
            int? winGain = nearest?.Delta;
            var wins = inGap.Count(g => g.Win);
            var losses = inGap.Count - wins;
            int? perWin = null;
            int? perLoss = null;
            if (inGap.Count == 1 || wins == 0 || losses == 0)
            {
                perWin = perLoss = JsRound((double)delta / inGap.Count);
            }
            else if (winGain is { } gain && delta - wins * gain < 0)
            {
                perWin = gain;
                perLoss = JsRound((double)(delta - wins * gain) / losses);
            }
            else if (wins != losses && (double)delta / (wins - losses) > 0)
            {
                perWin = JsRound((double)delta / (wins - losses));
                perLoss = -perWin;
            }
            if (perWin is null || perLoss is null) continue;
            foreach (var g in inGap) changes[g.Id] = g.Win ? perWin.Value : perLoss.Value;
        }
        return changes;
    }
}
