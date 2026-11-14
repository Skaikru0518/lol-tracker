namespace summon.Achievements;

public static class Tiers
{
    public static readonly string[] Names = ["Bronze", "Silver", "Gold", "Platinum"];
    public static readonly string[] Colors = ["#cd7f32", "#aab2bd", "#f1c40f", "#4fd1c5"];
    public const string LockedColor = "#7f8c8d";
    private const string EarnedColor = "#f1c40f";

    /// <summary>How many thresholds the value has reached (0 = none).</summary>
    public static int TierFor(int value, IReadOnlyList<int> thresholds) => thresholds.Count(t => value >= t);

    public static readonly string[] RankTiers = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];

    /// <summary>Iron 0 … Challenger 9; -1 for anything else.</summary>
    public static int RankTierOrdinal(string tier) => Array.IndexOf(RankTiers, tier);

    /// <summary>Highest rank tier ordinal among the tiers; -1 when there is none.</summary>
    public static int HighestTierOrdinal(IEnumerable<string> tiers) => tiers.Select(RankTierOrdinal).Append(-1).Max();

    /// <summary>Grandmaster for 8, Unranked for -1.</summary>
    public static string RankTierName(int ordinal) =>
        ordinal >= 0 && ordinal < RankTiers.Length ? RankTiers[ordinal][..1] + RankTiers[ordinal][1..].ToLowerInvariant() : "Unranked";

    /// <summary>Color of a reached tier; binary achievements use one earned color.</summary>
    public static string Color(int tier, int maxTier) => tier == 0 ? LockedColor : maxTier == 1 ? EarnedColor : Colors[tier - 1];
}
