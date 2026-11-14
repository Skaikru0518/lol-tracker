using System.Globalization;
using summon.Components.Ui;
using summon.Data;

namespace summon.Achievements;

public record ProgressView(int Tier, string? TierName, string Current, string? Next, int Percent);

/// <summary>Share of players at or above each tier, per "id:scope"; computed by the achievement job.</summary>
public record Rarity(int Players, Dictionary<string, double[]> Shares)
{
    public double? Share(string achievementId, string scope, int tier) =>
        tier > 0 && Shares.TryGetValue($"{achievementId}:{scope}", out var list) && tier - 1 < list.Length ? list[tier - 1] : null;
}

public static class Display
{
    /// <summary>A value as the card shows it: 1,500, 412k or Diamond.</summary>
    public static string FormatValue(ProgressDef def, int value) => def.Display switch
    {
        ProgressDisplay.Points => Format.Points(value),
        ProgressDisplay.Rank => Tiers.RankTierName(value),
        _ => value.ToString("N0", CultureInfo.InvariantCulture),
    };

    /// <summary>Name of a reached tier: a metal, a rank for peaks (Grandmaster+ at the top), Earned for binary ones.</summary>
    public static string TierLabel(ProgressDef def, int tier)
    {
        if (def.Thresholds.Length == 1) return "Earned";
        if (def.Display == ProgressDisplay.Rank) return Tiers.RankTierName(def.Thresholds[tier - 1]) + (tier == def.Thresholds.Length ? "+" : "");
        return Tiers.Names[tier - 1];
    }

    /// <summary>Tier label, current value, next target and bar fill (from the reached threshold to the next one).</summary>
    public static ProgressView View(ProgressDef def, AchievementProgress? row)
    {
        var tier = row?.Tier ?? 0;
        var value = row?.Value ?? 0;
        var max = def.Thresholds.Length;
        var tierName = tier == 0 ? null : TierLabel(def, tier);
        if (tier >= max) return new ProgressView(tier, tierName, FormatValue(def, value), null, 100);

        var floor = tier == 0 ? 0 : def.Thresholds[tier - 1];
        var target = def.Thresholds[tier];
        var percent = (int)Math.Floor(Math.Clamp((value - floor) / (double)(target - floor), 0, 1) * 100 + 0.5);
        return new ProgressView(tier, tierName, FormatValue(def, value), FormatValue(def, target), percent);
    }

    /// <summary>"4% of players" for the reached tier; null without rarity data or a reached tier.</summary>
    public static string? RarityText(Rarity? rarity, string achievementId, string scope, int tier)
    {
        if (rarity?.Share(achievementId, scope, tier) is not { } share) return null;
        var percent = share * 100;
        return percent < 1 ? "<1% of players" : $"{Math.Floor(percent + 0.5)}% of players";
    }

    /// <summary>The best reached milestones: highest tier first, then the rarest.</summary>
    public static List<AchievementProgress> TopMilestones(IEnumerable<AchievementProgress> rows, Rarity? rarity, int count = 3) =>
        rows.Where(r => r.Scope == Scopes.AllTime && r.Tier > 0)
            .OrderByDescending(r => r.Tier)
            .ThenBy(r => rarity?.Share(r.AchievementId, r.Scope, r.Tier) ?? double.PositiveInfinity)
            .Take(count)
            .ToList();

    /// <summary>The current season first, then archived seasons that have rows, newest first.</summary>
    public static List<Season> SeasonOptions(IEnumerable<AchievementProgress> rows, DateTime now)
    {
        var current = Seasons.Current(now);
        var scopes = rows.Select(r => r.Scope).ToHashSet();
        return Enumerable.Reverse(Seasons.All).Where(s => s.Id == current.Id || (scopes.Contains(s.Id) && s.Start < current.Start)).ToList();
    }

    /// <summary>"50% win rate · needs 55%" for a locked Iron Will that already has its 50 games; null otherwise.</summary>
    public static string? IronWillNote(AchievementProgress? ironWill, AchievementProgress? seasonWinner)
    {
        if (ironWill is null || ironWill.Tier > 0 || ironWill.Value < 50) return null;
        return $"{Math.Floor((seasonWinner?.Value ?? 0) * 100.0 / ironWill.Value + 0.5)}% win rate · needs 55%";
    }
}
