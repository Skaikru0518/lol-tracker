using summon.Data;

namespace summon.Achievements;

public record MergedProgress(int Value, int Tier, DateTime[] ReachedAt);

public static class Progress
{
    /// <summary>New value (the highest one for peaks), the higher tier, and a now date for each tier reached for the first time.</summary>
    public static MergedProgress Merge(AchievementProgress? stored, ProgressResult computed, DateTime now, bool keepHighestValue = false)
    {
        var reachedAt = stored?.ReachedAt ?? [];
        var tier = Math.Max(stored?.Tier ?? 0, computed.Tier);
        return new MergedProgress(
            keepHighestValue && stored is not null ? Math.Max(stored.Value, computed.Value) : computed.Value,
            tier,
            [.. reachedAt, .. Enumerable.Repeat(now, Math.Max(0, tier - reachedAt.Length))]);
    }

    public static bool Changed(AchievementProgress? stored, MergedProgress merged) =>
        stored is null || stored.Value != merged.Value || stored.Tier != merged.Tier || !stored.ReachedAt.SequenceEqual(merged.ReachedAt);

    /// <summary>The current season plus every closed season that has no rows yet; closed seasons are never rewritten.</summary>
    public static List<(Season Season, bool Closed)> SeasonsToCompute(ISet<string> existingScopes, DateTime now)
    {
        var current = Seasons.Current(now);
        return Seasons.All
            .Where(s => s.Start <= now && (s.Id == current.Id || !existingScopes.Contains(s.Id)))
            .Select(s => (s, s.Id != current.Id))
            .ToList();
    }

    /// <summary>Whether a season has anything to show; empty closed seasons get no rows.</summary>
    public static bool HasSeasonData(SeasonalInputs inputs) => inputs.Champions.Any(c => c.Games > 0) || inputs.Snapshots.Count > 0;

    /// <summary>Share of players at or above each tier, per "id:scope", rounded to a tenth of a percent.</summary>
    public static Dictionary<string, double[]> RarityShares(IEnumerable<(string AchievementId, string Scope, int Tier, int Count)> rows, int players)
    {
        if (players == 0) return [];
        var shares = new Dictionary<string, List<double>>();
        foreach (var row in rows)
        {
            if (row.Tier == 0) continue;
            var key = $"{row.AchievementId}:{row.Scope}";
            if (!shares.TryGetValue(key, out var list)) shares[key] = list = [];
            for (var t = 0; t < row.Tier; t++)
            {
                if (t == list.Count) list.Add(0);
                list[t] += (double)row.Count / players;
            }
        }
        return shares.ToDictionary(p => p.Key, p => p.Value.Select(v => Math.Floor(v * 1000 + 0.5) / 1000).ToArray());
    }
}
