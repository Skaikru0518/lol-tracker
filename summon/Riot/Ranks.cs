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

    /// <summary>"Gold II", or just the tier for apex tiers.</summary>
    public static string Label(string tier, string rank)
    {
        var name = tier[0] + tier[1..].ToLowerInvariant();
        return tier is "MASTER" or "GRANDMASTER" or "CHALLENGER" ? name : $"{name} {rank}";
    }
}
