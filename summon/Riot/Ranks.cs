namespace summon.Riot;

public static class Ranks
{
    public static readonly string[] QueueTypes = ["RANKED_SOLO_5x5", "RANKED_FLEX_SR", "RANKED_PREMADE_5x5"];

    public static string QueueTitle(string queueType) => queueType switch
    {
        "RANKED_SOLO_5x5" => "Ranked Solo",
        "RANKED_FLEX_SR" => "Ranked Flex",
        "RANKED_PREMADE_5x5" => "Ranked 5s",
        _ => queueType
    };

    public static string QueueShort(string queueType) => queueType switch
    {
        "RANKED_SOLO_5x5" => "SOLO",
        "RANKED_FLEX_SR" => "FLEX",
        "RANKED_PREMADE_5x5" => "5S",
        _ => queueType
    };

    public static string? QueueForQueueId(int queueId) => queueId switch
    {
        420 => "RANKED_SOLO_5x5",
        440 => "RANKED_FLEX_SR",
        710 => "RANKED_PREMADE_5x5",
        _ => null
    };

    private static readonly Dictionary<string, string> Colors = new()
    {
        ["IRON"] = "#6b6b6b",
        ["BRONZE"] = "#a17c5a",
        ["SILVER"] = "#8fa0b0",
        ["GOLD"] = "#daa520",
        ["PLATINUM"] = "#4dc8b4",
        ["EMERALD"] = "#2ecc71",
        ["DIAMOND"] = "#5b8bf5",
        ["MASTER"] = "#9b59b6",
        ["GRANDMASTER"] = "#e74c3c",
        ["CHALLENGER"] = "#f1c40f",
    };

    public static string? Color(string tier) => Colors.GetValueOrDefault(tier);

    private static readonly string[] Tiers = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
    private static readonly string[] Divisions = ["IV", "III", "II", "I"];

    // Iron IV = 1 ... Diamond I = 28, Master = 29, Grandmaster = 30, Challenger = 31
    private static int Points(string tier, string rank)
    {
        var tierIndex = Array.IndexOf(Tiers, tier);
        if (tierIndex == -1) return 0;
        if (tierIndex >= 7) return 28 + tierIndex - 7 + 1;
        var divisionIndex = Array.IndexOf(Divisions, rank);
        return divisionIndex == -1 ? 0 : tierIndex * 4 + divisionIndex + 1;
    }

    /// <summary>Average rank of a lobby in the match's ranked queue (Solo/Duo otherwise); null when nobody is ranked.</summary>
    public static (string Tier, string Rank)? Average(IReadOnlyDictionary<string, List<summon.Data.RankedEntry>>? ranks, int queueId)
    {
        if (ranks is null) return null;
        var queueType = QueueForQueueId(queueId) ?? "RANKED_SOLO_5x5";
        var points = ranks.Values
            .Select(entries => entries.FirstOrDefault(e => e.QueueType == queueType))
            .OfType<summon.Data.RankedEntry>()
            .Select(e => Points(e.Tier, e.Rank))
            .ToList();
        if (points.Count == 0) return null;

        var average = points.Average();
        if (average >= 31) return ("CHALLENGER", "");
        if (average >= 30) return ("GRANDMASTER", "");
        if (average >= 29) return ("MASTER", "");
        // Math.round from JavaScript, as in the original
        var rounded = Math.Max(1, (int)Math.Floor(average + 0.5));
        return (Tiers[(rounded - 1) / 4], Divisions[(rounded - 1) % 4]);
    }

    /// <summary>"Gold II", or just the tier for apex tiers.</summary>
    public static string Label(string tier, string rank)
    {
        var name = tier[0] + tier[1..].ToLowerInvariant();
        return tier is "MASTER" or "GRANDMASTER" or "CHALLENGER" ? name : $"{name} {rank}";
    }
}
