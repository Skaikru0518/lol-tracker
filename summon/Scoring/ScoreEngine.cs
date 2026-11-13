using summon.Riot;

namespace summon.Scoring;

public record MetricScore(string Id, double Value, int Percentile);

public record CategoryScore(string Id, int Score, string Grade, List<MetricScore> Metrics);

public record OpponentDiff(string ChampionName, int GoldDiff, int? XpDiff, int CsDiff, int DamageDiff);

public record PerformanceScore(string Role, int Score, string Grade, int BaselineGames, List<CategoryScore> Categories, OpponentDiff? Opponent);

public record Calibration(double[] Overall, Dictionary<string, double[]> Categories);

public record RoleBaseline(int Games, Dictionary<string, double[]> Metrics, Calibration? Calibration);

/// <summary>
/// Port of the original's performance score: each metric is ranked against the role's stored games, metrics average into
/// categories, categories into a role-weighted score, and both are calibrated and curved so an average game lands near 65.
/// </summary>
public static class ScoreEngine
{
    public const int MinBaselineGames = 30;
    private static readonly int[] EligibleQueues = [420, 440, 710];
    private static readonly double[] QuantileSteps = Enumerable.Range(0, 21).Select(i => i / 20.0).ToArray();

    // Percentile to score; tuned so the average game is ~65 and S+ (90+) is the top 7%
    private static readonly (double X, double Y)[] Curve = [(0, 20), (8, 40), (30, 55), (60, 70), (80, 80), (93, 90), (100, 100)];

    /// <summary>Ranked Solo, Flex and 5s games of five minutes or more, the same games that earn LP and badges.</summary>
    public static bool IsEligible(int queueId, int gameDuration) => EligibleQueues.Contains(queueId) && gameDuration >= 300;

    // Math.round from JavaScript, which rounds halves up; the original's rounding is what the cached scores were built with
    public static int JsRound(double value) => (int)Math.Floor(value + 0.5);

    private static int Cs(RiotParticipant p) => p.TotalMinionsKilled + p.NeutralMinionsKilled;

    /// <summary>The one enemy in the same position, only when both teams have exactly one player there.</summary>
    public static RiotParticipant? LaneOpponent(RiotParticipant player, List<RiotParticipant> participants)
    {
        if (string.IsNullOrEmpty(player.TeamPosition)) return null;
        var same = participants.Where(p => p.TeamPosition == player.TeamPosition).ToList();
        var enemies = same.Where(p => p.TeamId != player.TeamId).ToList();
        var mates = same.Count(p => p.TeamId == player.TeamId);
        return enemies.Count == 1 && mates == 1 ? enemies[0] : null;
    }

    public static (Dictionary<string, double> Values, RiotParticipant? Opponent) Metrics(RiotParticipant player, List<RiotParticipant> participants, int gameDuration)
    {
        var minutes = gameDuration / 60.0;
        var team = participants.Where(p => p.TeamId == player.TeamId).ToList();
        var teamKills = team.Sum(p => p.Kills);
        var teamDamage = team.Sum(p => (long)p.TotalDamageDealtToChampions);
        var teamTaken = team.Sum(p => (long)p.TotalDamageTaken);
        var opponent = LaneOpponent(player, participants);

        var values = new Dictionary<string, double>
        {
            ["csPerMin"] = Cs(player) / minutes,
            ["goldPerMin"] = player.GoldEarned / minutes,
            ["kda"] = (double)(player.Kills + player.Assists) / Math.Max(player.Deaths, 1),
            ["deathsPerMin"] = player.Deaths / minutes,
            ["killParticipation"] = teamKills > 0 ? (double)(player.Kills + player.Assists) / teamKills : 0,
            ["damageShare"] = teamDamage > 0 ? (double)player.TotalDamageDealtToChampions / teamDamage : 0,
            ["damageTakenShare"] = teamTaken > 0 ? (double)player.TotalDamageTaken / teamTaken : 0,
            ["epicKills"] = player.DragonKills + player.BaronKills,
            ["structureKills"] = player.TurretKills + player.InhibitorKills,
            ["visionPerMin"] = player.VisionScore / minutes,
            ["wardsPlacedPerMin"] = player.WardsPlaced / minutes,
            ["wardsKilledPerMin"] = player.WardsKilled / minutes,
            ["controlWards"] = player.VisionWardsBoughtInGame,
        };
        if (player.DamageDealtToObjectives is { } objectives) values["objectiveDamagePerMin"] = objectives / minutes;
        if (player.ObjectivesStolen is { } steals) values["steals"] = steals;

        if (opponent is not null)
        {
            values["goldDiffPerMin"] = (player.GoldEarned - opponent.GoldEarned) / minutes;
            values["csDiffPerMin"] = (Cs(player) - Cs(opponent)) / minutes;
            values["damageDiffPerMin"] = (player.TotalDamageDealtToChampions - opponent.TotalDamageDealtToChampions) / minutes;
            if (player.ChampExperience is { } xp && opponent.ChampExperience is { } opponentXp) values["xpDiffPerMin"] = (xp - opponentXp) / minutes;
        }
        return (values, opponent);
    }

    /// <summary>Where a value falls among 21 quantiles, 0 to 100.</summary>
    public static double PercentileOf(double value, double[] quantiles)
    {
        var last = quantiles.Length - 1;
        var step = 100.0 / last;
        if (value < quantiles[0]) return 0;
        if (value > quantiles[last]) return 100;

        // A value matching a run of equal quantiles (e.g. most players have 0 steals) sits in the run's middle
        var first = Array.IndexOf(quantiles, value);
        if (first != -1) return (first + Array.LastIndexOf(quantiles, value)) / 2.0 * step;

        var i = Enumerable.Range(0, last).First(idx => quantiles[idx] < value && value < quantiles[idx + 1]);
        return (i + (value - quantiles[i]) / (quantiles[i + 1] - quantiles[i])) * step;
    }

    /// <summary>The 21 quantiles of the values, interpolated like Postgres percentile_cont; null when empty.</summary>
    public static double[]? Quantiles(IReadOnlyCollection<double> values)
    {
        if (values.Count == 0) return null;
        var sorted = values.Order().ToArray();
        return QuantileSteps.Select(step =>
        {
            var pos = step * (sorted.Length - 1);
            var lo = (int)Math.Floor(pos);
            var hi = (int)Math.Ceiling(pos);
            return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
        }).ToArray();
    }

    private static double CurveScore(double percentile)
    {
        var p = Math.Clamp(percentile, 0, 100);
        var i = Enumerable.Range(0, Curve.Length - 1).First(idx => p <= Curve[idx + 1].X);
        var (x0, y0) = Curve[i];
        var (x1, y1) = Curve[i + 1];
        return y0 + (p - x0) / (x1 - x0) * (y1 - y0);
    }

    private record RawCategory(string Id, double Raw, List<MetricScore> Metrics);

    /// <summary>Mean metric percentiles per category and their role-weighted mean, before calibration.</summary>
    private static (List<RawCategory> Categories, double Overall)? RawScores(Dictionary<string, double> values, RoleBaseline baseline, string role)
    {
        var categories = new List<RawCategory>();
        foreach (var id in Weights.Categories)
        {
            var metrics = Weights.CategoryMetrics[id]
                .Where(metric => values.ContainsKey(metric) && baseline.Metrics.ContainsKey(metric))
                .Select(metric =>
                {
                    var raw = PercentileOf(values[metric], baseline.Metrics[metric]);
                    // Rounded like the original, which cached every score as JSON
                    return new MetricScore(metric, Math.Floor(values[metric] * 100 + 0.5) / 100, JsRound(Weights.LowerIsBetter.Contains(metric) ? 100 - raw : raw));
                })
                .ToList();
            if (metrics.Count > 0) categories.Add(new RawCategory(id, metrics.Average(m => m.Percentile), metrics));
        }
        if (categories.Count == 0) return null;
        var weights = Weights.RoleWeights[role];
        var totalWeight = categories.Sum(c => weights[c.Id]);
        return (categories, categories.Sum(c => c.Raw * weights[c.Id]) / totalWeight);
    }

    // Averaging percentiles pulls every game towards 50, so raw scores are ranked against the role's own raw scores
    private static int Calibrated(double raw, double[]? quantiles) => JsRound(quantiles is null ? raw : CurveScore(PercentileOf(raw, quantiles)));

    public static PerformanceScore? Score(RiotMatch match, string puuid, IReadOnlyDictionary<string, RoleBaseline>? baselines)
    {
        var info = match.Info;
        if (baselines is null || !IsEligible(info.QueueId, info.GameDuration)) return null;
        var player = info.Participants.FirstOrDefault(p => p.Puuid == puuid);
        var role = player?.TeamPosition;
        if (player is null || role is null || !Weights.Roles.Contains(role) || !baselines.TryGetValue(role, out var baseline) || baseline.Games < MinBaselineGames) return null;

        var (values, opponent) = Metrics(player, info.Participants, info.GameDuration);
        if (RawScores(values, baseline, role) is not { } raw) return null;

        var categories = raw.Categories.Select(c =>
        {
            var score = Calibrated(c.Raw, baseline.Calibration?.Categories.GetValueOrDefault(c.Id));
            return new CategoryScore(c.Id, score, Grades.For(score), c.Metrics);
        }).ToList();
        var overall = Calibrated(raw.Overall, baseline.Calibration?.Overall);

        return new PerformanceScore(role, overall, Grades.For(overall), baseline.Games, categories, opponent is null ? null : new OpponentDiff(
            opponent.ChampionName,
            player.GoldEarned - opponent.GoldEarned,
            player.ChampExperience is { } xp && opponent.ChampExperience is { } opponentXp ? xp - opponentXp : null,
            Cs(player) - Cs(opponent),
            player.TotalDamageDealtToChampions - opponent.TotalDamageDealtToChampions));
    }

    /// <summary>Every scorable player in a match, by puuid.</summary>
    public static Dictionary<string, PerformanceScore> ScoreMatch(RiotMatch match, IReadOnlyDictionary<string, RoleBaseline>? baselines)
    {
        var scores = new Dictionary<string, PerformanceScore>();
        foreach (var participant in match.Info.Participants)
            if (Score(match, participant.Puuid, baselines) is { } score) scores[participant.Puuid] = score;
        return scores;
    }

    /// <summary>
    /// Per-role metric quantiles and calibration from stored games; the original builds the same numbers with SQL in a daily job.
    /// </summary>
    public static Dictionary<string, RoleBaseline> BuildBaselines(IEnumerable<RiotMatch> matches)
    {
        var rows = new List<(string Role, Dictionary<string, double> Values)>();
        foreach (var match in matches)
        {
            if (!IsEligible(match.Info.QueueId, match.Info.GameDuration)) continue;
            foreach (var p in match.Info.Participants)
                if (Weights.Roles.Contains(p.TeamPosition)) rows.Add((p.TeamPosition, Metrics(p, match.Info.Participants, match.Info.GameDuration).Values));
        }

        var baselines = new Dictionary<string, RoleBaseline>();
        foreach (var group in rows.GroupBy(r => r.Role))
        {
            var metrics = new Dictionary<string, double[]>();
            foreach (var metric in Weights.MetricIds)
                if (Quantiles(group.Where(r => r.Values.ContainsKey(metric)).Select(r => r.Values[metric]).ToList()) is { } q) metrics[metric] = q;
            baselines[group.Key] = new RoleBaseline(group.Count(), metrics, null);
        }

        foreach (var group in rows.GroupBy(r => r.Role))
        {
            var baseline = baselines[group.Key];
            var overall = new List<double>();
            var categories = new Dictionary<string, List<double>>();
            foreach (var (_, values) in group)
            {
                if (RawScores(values, baseline, group.Key) is not { } raw) continue;
                overall.Add(raw.Overall);
                foreach (var c in raw.Categories) (categories.TryGetValue(c.Id, out var list) ? list : categories[c.Id] = []).Add(c.Raw);
            }
            if (Quantiles(overall) is not { } overallQuantiles) continue;
            baselines[group.Key] = baseline with
            {
                Calibration = new Calibration(overallQuantiles, categories.ToDictionary(c => c.Key, c => Quantiles(c.Value)!)),
            };
        }
        return baselines;
    }
}
