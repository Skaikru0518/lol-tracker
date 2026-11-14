namespace summon.Riot;

public static class Queues
{
    private static readonly Dictionary<int, string> Names = new()
    {
        [400] = "Normal Draft",
        [420] = "Ranked Solo/Duo",
        [430] = "Normal Blind",
        [440] = "Ranked Flex",
        [450] = "ARAM",
        [480] = "Swiftplay",
        [490] = "Quickplay",
        [700] = "Clash",
        [710] = "Ranked 5s",
        [720] = "ARAM Clash",
        [830] = "Co-op Intro",
        [840] = "Co-op Beginner",
        [850] = "Co-op Intermediate",
        [870] = "Co-op Intro",
        [880] = "Co-op Beginner",
        [890] = "Co-op Intermediate",
        [900] = "ARURF",
        [1010] = "Snow ARURF",
        [1020] = "One for All",
        [1300] = "Nexus Blitz",
        [1400] = "Ultimate Spellbook",
        [1700] = "Arena",
        [1710] = "Arena",
        [1750] = "Arena",
        [1900] = "Pick URF",
        [2300] = "Brawl",
        [2400] = "ARAM Mayhem",
    };

    /// <summary>Summoner's Rift queues where roles mean something: normals, ranked and Clash.</summary>
    public static readonly int[] RiftIds = [400, 420, 430, 440, 480, 490, 700, 710];

    private static readonly int[] ArenaIds = [1700, 1710, 1750];

    public static bool IsArena(int queueId) => ArenaIds.Contains(queueId);

    /// <summary>Platform host of a match id, e.g. EUN1_123 to eun1.</summary>
    public static string PlatformOf(string matchId) => matchId.Split('_')[0].ToLowerInvariant();

    public static string PlacementColor(int placement) => placement switch
    {
        1 => "#f1c40f",
        2 => "#bdc3c7",
        3 => "#e67e22",
        4 => "#2ecc71",
        _ => "#e74c3c"
    };

    public static string PlacementSuffix(int placement) => placement switch
    {
        1 => "st",
        2 => "nd",
        3 => "rd",
        _ => "th"
    };

    /// <summary>Queue ids a filter keeps (include) or drops (exclude); "all" drops Arena.</summary>
    public static (bool Include, int[] Ids) Selection(string filter) => filter switch
    {
        "solo" => (true, [420]),
        "flex" => (true, [440]),
        "premade" => (true, [710]),
        "normal" => (true, [400, 430, 480, 490]),
        "aram" => (true, [450, 720]),
        "mayhem" => (true, [2400]),
        "arena" => (true, ArenaIds),
        "event" => (true, [900, 1010, 1020, 1300, 1400, 1900, 2300]),
        _ => (false, ArenaIds)
    };

    public static string Name(int queueId, string fallback = "Custom") => Names.GetValueOrDefault(queueId, fallback);

    /// <summary>Queue label for a match row: ranked queues use their short ranked title.</summary>
    public static string Short(int queueId) =>
        Ranks.QueueForQueueId(queueId) is { } ranked ? Ranks.QueueTitle(ranked) : Name(queueId);

    /// <summary>Games shorter than five minutes are remakes.</summary>
    public static bool IsRemake(int durationSeconds) => durationSeconds < 300;
}
