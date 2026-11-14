namespace summon.Scoring;

/// <summary>Categories, their metrics and how much each category counts per role; the same tables as the original.</summary>
public static class Weights
{
    public static readonly string[] Categories = ["laning", "farming", "combat", "teamfight", "objectives", "vision"];

    public static readonly Dictionary<string, string> CategoryLabels = new()
    {
        ["laning"] = "Laning",
        ["farming"] = "Farming",
        ["combat"] = "Combat",
        ["teamfight"] = "Teamfight",
        ["objectives"] = "Objectives",
        ["vision"] = "Vision",
    };

    public static readonly Dictionary<string, string> CategoryShortLabels = new()
    {
        ["laning"] = "Lane",
        ["farming"] = "Farm",
        ["combat"] = "Combat",
        ["teamfight"] = "Teamfight",
        ["objectives"] = "Objective",
        ["vision"] = "Vision",
    };

    public static readonly string[] MetricIds =
    [
        "goldDiffPerMin", "xpDiffPerMin", "csDiffPerMin", "damageDiffPerMin", "csPerMin", "goldPerMin", "kda", "deathsPerMin",
        "killParticipation", "damageShare", "damageTakenShare", "objectiveDamagePerMin", "epicKills", "structureKills", "steals",
        "visionPerMin", "wardsPlacedPerMin", "wardsKilledPerMin", "controlWards",
    ];

    public static readonly Dictionary<string, string[]> CategoryMetrics = new()
    {
        ["laning"] = ["goldDiffPerMin", "xpDiffPerMin", "csDiffPerMin", "damageDiffPerMin"],
        ["farming"] = ["csPerMin", "goldPerMin"],
        ["combat"] = ["kda", "deathsPerMin", "killParticipation"],
        ["teamfight"] = ["damageShare", "damageTakenShare", "killParticipation"],
        ["objectives"] = ["objectiveDamagePerMin", "epicKills", "structureKills", "steals"],
        ["vision"] = ["visionPerMin", "wardsPlacedPerMin", "wardsKilledPerMin", "controlWards"],
    };

    public static readonly HashSet<string> LowerIsBetter = ["deathsPerMin"];

    public static readonly string[] Roles = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

    public static readonly Dictionary<string, string> RoleLabels = new()
    {
        ["TOP"] = "Top",
        ["JUNGLE"] = "Jungle",
        ["MIDDLE"] = "Mid",
        ["BOTTOM"] = "Bot",
        ["UTILITY"] = "Support",
    };

    public static readonly Dictionary<string, Dictionary<string, int>> RoleWeights = new()
    {
        ["TOP"] = new() { ["laning"] = 25, ["farming"] = 15, ["combat"] = 20, ["teamfight"] = 20, ["objectives"] = 15, ["vision"] = 5 },
        ["JUNGLE"] = new() { ["laning"] = 10, ["farming"] = 15, ["combat"] = 20, ["teamfight"] = 20, ["objectives"] = 25, ["vision"] = 10 },
        ["MIDDLE"] = new() { ["laning"] = 25, ["farming"] = 15, ["combat"] = 25, ["teamfight"] = 20, ["objectives"] = 10, ["vision"] = 5 },
        ["BOTTOM"] = new() { ["laning"] = 20, ["farming"] = 25, ["combat"] = 20, ["teamfight"] = 20, ["objectives"] = 10, ["vision"] = 5 },
        ["UTILITY"] = new() { ["laning"] = 15, ["farming"] = 5, ["combat"] = 15, ["teamfight"] = 25, ["objectives"] = 10, ["vision"] = 30 },
    };
}

public static class Grades
{
    private static readonly (string Grade, int Min)[] MinScore = [("S+", 90), ("S", 80), ("A", 70), ("B", 55), ("C", 40), ("D", 0)];

    public static readonly Dictionary<string, string> Colors = new()
    {
        ["S+"] = "#f5c542",
        ["S"] = "#a78bfa",
        ["A"] = "#34c38f",
        ["B"] = "#5b8bf5",
        ["C"] = "#f39c12",
        ["D"] = "#ef5350",
    };

    public static string For(int score) => MinScore.First(g => score >= g.Min).Grade;

    /// <summary>Grade ranges from D up to S+, for the help dialog's scale.</summary>
    public static IEnumerable<(string Grade, int Min, int Max)> Bands() =>
        MinScore.Select((g, i) => (g.Grade, g.Min, i == 0 ? 100 : MinScore[i - 1].Min)).Reverse();
}

/// <summary>How the match page names and prints each metric and the lane opponent differences.</summary>
public static class MetricFormat
{
    public static readonly Dictionary<string, string> Labels = new()
    {
        ["goldDiffPerMin"] = "Gold diff / min", ["xpDiffPerMin"] = "XP diff / min", ["csDiffPerMin"] = "CS diff / min",
        ["damageDiffPerMin"] = "Damage diff / min", ["csPerMin"] = "CS / min", ["goldPerMin"] = "Gold / min", ["kda"] = "KDA",
        ["deathsPerMin"] = "Deaths / min", ["killParticipation"] = "Kill participation", ["damageShare"] = "Team damage share",
        ["damageTakenShare"] = "Damage taken share", ["objectiveDamagePerMin"] = "Objective damage / min", ["epicKills"] = "Dragons and barons",
        ["structureKills"] = "Turrets and inhibitors", ["steals"] = "Objective steals", ["visionPerMin"] = "Vision score / min",
        ["wardsPlacedPerMin"] = "Wards placed / min", ["wardsKilledPerMin"] = "Wards killed / min", ["controlWards"] = "Control wards",
    };

    private static readonly HashSet<string> Percent = ["killParticipation", "damageShare", "damageTakenShare"];
    private static readonly HashSet<string> Count = ["epicKills", "structureKills", "steals", "controlWards"];

    public static string Metric(string id, double value) =>
        Percent.Contains(id) ? $"{ScoreEngine.JsRound(value * 100)}%"
        : Count.Contains(id) ? ScoreEngine.JsRound(value).ToString(System.Globalization.CultureInfo.InvariantCulture)
        : id == "kda" ? value.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)
        : value.ToString("0.0", System.Globalization.CultureInfo.InvariantCulture);

    public static string Diff(double value)
    {
        var rounded = ScoreEngine.JsRound(value);
        return $"{(rounded > 0 ? "+" : "")}{rounded.ToString("N0", System.Globalization.CultureInfo.InvariantCulture)}";
    }
}
