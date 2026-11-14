namespace summon.Achievements;

/// <summary>Achievements of one ranked season; earned ones stay for that season.</summary>
public static class Seasonal
{
    public static readonly ProgressDef[] All =
    [
        new("season-grinder", "Season Grinder", "Play 100 ranked games this season", "season-grinder", "#95a5a6", [100]),
        new("season-winner", "Season Winner", "Win 50 ranked games this season", "season-winner", "#2ecc71", [50]),
        new("iron-will", "Iron Will", "Keep a 55%+ win rate over 50+ ranked games this season", "iron-will", "#7f8c8d", [50]),
        new("hot-streak", "Hot Streak", "Win 7 ranked games in a row this season", "hot-streak", "#e74c3c", [7]),
        new("main-character", "Main Character", "Play 30 ranked games on one champion this season", "main-character", "#e91e63", [30]),
        new("promoted", "Promoted", "Climb at least one tier in a ranked queue this season", "promoted", "#f1c40f", [1]),
        new("triple-threat", "Triple Threat", "Be ranked in Solo, Flex and 5s this season", "triple-threat", "#3498db", [3]),
        new("pool-party", "Pool Party", "Play 20 different champions in ranked this season", "pool-party", "#16a085", [20]),
        new("role-swap", "Role Swap", "Win a ranked game in all five positions this season", "role-swap", "#1abc9c", [5]),
        new("spotless", "Spotless", "Finish 10 ranked games without dying this season", "spotless", "#f1c40f", [10]),
        new("stomper", "Stomper", "Win 5 ranked games in under 20 minutes this season", "stomper", "#e67e22", [5]),
        new("marathon", "Marathon", "Win a ranked game that lasted over 40 minutes this season", "marathon", "#8e44ad", [1]),
        new("comeback-kid", "Comeback Kid", "Win a ranked game right after losing 5 in a row this season", "comeback-kid", "#2ecc71", [1]),
        new("season-penta", "Season Penta", "Get a pentakill in ranked this season", "season-penta", "#e74c3c", [1]),
        new("dedication", "Dedication", "Play ranked on 50 different days this season", "dedication", "#3498db", [50]),
        new("season-peak", "Season Peak", "Highest tier reached this season", "season-peak", "#5b8bf5", Milestones.RankThresholds, ProgressDisplay.Rank),
    ];

    public static ProgressDef? Get(string id) => All.FirstOrDefault(s => s.Id == id);

    private const int IronWillPercent = 55;
    private const int StompSeconds = 20 * 60;
    private const int MarathonSeconds = 40 * 60;
    private const int ComebackLosses = 5;
    private static readonly string[] Positions = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
    private static readonly string[] RankedQueues = ["RANKED_SOLO_5x5", "RANKED_FLEX_SR", "RANKED_PREMADE_5x5"];
    private static readonly TimeZoneInfo Budapest = TimeZoneInfo.FindSystemTimeZoneById("Europe/Budapest");

    /// <summary>Longest run of consecutive wins.</summary>
    public static int LongestWinStreak(IEnumerable<bool> wins)
    {
        int best = 0, run = 0;
        foreach (var win in wins)
        {
            run = win ? run + 1 : 0;
            best = Math.Max(best, run);
        }
        return best;
    }

    /// <summary>1 when a win came right after at least five straight losses.</summary>
    private static int Comeback(List<GameRow> games)
    {
        var losses = 0;
        foreach (var game in games)
        {
            if (game.Win && losses >= ComebackLosses) return 1;
            losses = game.Win ? 0 : losses + 1;
        }
        return 0;
    }

    /// <summary>1 when any queue ended (or currently is) above the tier of its first snapshot in the season.</summary>
    private static int Promoted(List<TierSnapshot> snapshots, List<CurrentRank>? ranked)
    {
        var sorted = snapshots.OrderBy(s => s.CreatedAt).ToList();
        return RankedQueues.Any(queue =>
        {
            var inQueue = sorted.Where(s => s.QueueType == queue).ToList();
            if (inQueue.Count == 0) return false;
            var latest = ranked is not null ? ranked.FirstOrDefault(r => r.QueueType == queue)?.Tier : inQueue[^1].Tier;
            return latest is not null && Tiers.RankTierOrdinal(latest) > Tiers.RankTierOrdinal(inQueue[0].Tier);
        }) ? 1 : 0;
    }

    private static DateTime BudapestDay(long timestampMs) =>
        TimeZoneInfo.ConvertTime(DateTimeOffset.FromUnixTimeMilliseconds(timestampMs), Budapest).Date;

    /// <summary>Results for one season, in definition order; Triple Threat needs current ranks and is left out otherwise.</summary>
    public static List<ProgressResult> Evaluate(string seasonId, SeasonalInputs inputs)
    {
        var (champions, played, snapshots, ranked) = inputs;
        var wonGames = played.Where(g => g.Win).ToList();
        var games = champions.Sum(c => c.Games);
        var won = champions.Sum(c => c.Wins);
        var values = new Dictionary<string, int>
        {
            ["season-grinder"] = games,
            ["season-winner"] = won,
            ["iron-will"] = games,
            ["hot-streak"] = LongestWinStreak(played.Select(g => g.Win)),
            ["main-character"] = champions.Select(c => c.Games).Append(0).Max(),
            ["promoted"] = Promoted(snapshots, ranked),
            ["triple-threat"] = ranked is null ? 0 : RankedQueues.Count(q => ranked.Any(r => r.QueueType == q)),
            ["pool-party"] = champions.Count(c => c.Games > 0),
            ["role-swap"] = Positions.Count(p => wonGames.Any(g => g.TeamPosition == p)),
            ["spotless"] = champions.Sum(c => c.Deathless),
            ["stomper"] = wonGames.Count(g => g.GameDuration < StompSeconds),
            ["marathon"] = wonGames.Count(g => g.GameDuration > MarathonSeconds),
            ["comeback-kid"] = Comeback(played),
            ["season-penta"] = champions.Sum(c => c.Pentas),
            ["dedication"] = played.Select(g => BudapestDay(g.GameCreation)).Distinct().Count(),
            ["season-peak"] = Tiers.HighestTierOrdinal(snapshots.Select(s => s.Tier).Concat((ranked ?? []).Select(r => r.Tier))),
        };

        return All.Where(def => ranked is not null || def.Id != "triple-threat").Select(def =>
        {
            var value = values[def.Id];
            var tier = def.Id == "iron-will"
                ? games >= def.Thresholds[0] && won * 100 >= games * IronWillPercent ? 1 : 0
                : Tiers.TierFor(value, def.Thresholds);
            return new ProgressResult(def.Id, seasonId, value, tier);
        }).ToList();
    }
}
