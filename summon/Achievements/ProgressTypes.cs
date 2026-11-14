namespace summon.Achievements;

/// <summary>One eligible game of a player, reduced to what achievements count; filled by a raw SQL query.</summary>
public class GameRow
{
    public string ChampionName { get; set; } = "";
    public long GameCreation { get; set; }
    public int GameDuration { get; set; }
    public string TeamPosition { get; set; } = "";
    public bool Win { get; set; }
    public int Pentas { get; set; }
    public int Quadras { get; set; }
    public int Kills { get; set; }
    public int Deaths { get; set; }
    public int Assists { get; set; }
    public int Vision { get; set; }
    public int Turrets { get; set; }
    public int Epics { get; set; }
    public int Gold { get; set; }
    public int Cs { get; set; }
    public int Damage { get; set; }
    public int WardsPlaced { get; set; }
    public int WardsKilled { get; set; }
    public int Support { get; set; }
    public bool FirstBlood { get; set; }
    public int LargestSpree { get; set; }
}

/// <summary>Per-champion sums over a player's eligible games in some time range.</summary>
public class ChampionTotals(string championName)
{
    public string ChampionName { get; } = championName;
    public int Games { get; set; }
    public int Wins { get; set; }
    public int Pentas { get; set; }
    public int Quadras { get; set; }
    public int Kills { get; set; }
    public int Assists { get; set; }
    public int Vision { get; set; }
    public int Turrets { get; set; }
    public int Epics { get; set; }
    public int Gold { get; set; }
    public int Cs { get; set; }
    public int Damage { get; set; }
    public int WardsPlaced { get; set; }
    public int WardsKilled { get; set; }
    public int Support { get; set; }
    public int FirstBloods { get; set; }
    public int Deathless { get; set; }
    public int Legendary { get; set; }
    public long Seconds { get; set; }
}

public record TierSnapshot(string QueueType, string Tier, DateTime CreatedAt);
public record CurrentRank(string QueueType, string Tier);
public record MasteryPoint(int ChampionLevel, int ChampionPoints);

public record MilestoneInputs(List<ChampionTotals> Champions, List<TierSnapshot> Snapshots, List<CurrentRank> Ranked, List<MasteryPoint> Masteries);

/// <summary>Inputs for one season; Games are oldest first, Ranked is null for a closed season (current ranks say nothing about it).</summary>
public record SeasonalInputs(List<ChampionTotals> Champions, List<GameRow> Games, List<TierSnapshot> Snapshots, List<CurrentRank>? Ranked);

public record ProgressResult(string AchievementId, string Scope, int Value, int Tier);

public enum ProgressDisplay { Count, Points, Rank }

public record ProgressDef(string Id, string Name, string Description, string Icon, string Color, int[] Thresholds, ProgressDisplay Display = ProgressDisplay.Count);

public static class Scopes
{
    /// <summary>Scope of all-time milestone rows; seasonal rows use the season id.</summary>
    public const string AllTime = "all";
}
