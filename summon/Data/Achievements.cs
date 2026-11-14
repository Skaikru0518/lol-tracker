namespace summon.Data;

/// <summary>A Current form achievement an account holds right now; these come and go with its recent games.</summary>
public class PlayerAchievement
{
    public required string Puuid { get; set; }
    public required string AchievementId { get; set; }
    public DateTime EarnedAt { get; set; }
}

/// <summary>Milestone (scope "all") and seasonal (scope = season id) progress; tiers only go up.</summary>
public class AchievementProgress
{
    public required string Puuid { get; set; }
    public required string AchievementId { get; set; }
    public required string Scope { get; set; }
    public int Value { get; set; }
    public int Tier { get; set; }
    // ReachedAt[i] is when tier i+1 was first detected
    public DateTime[] ReachedAt { get; set; } = [];
    public DateTime UpdatedAt { get; set; }
}

public class MatchBadge
{
    public required string MatchId { get; set; }
    public required string Puuid { get; set; }
    public required string BadgeId { get; set; }
}

/// <summary>Small app-wide values by key: achievement rarity and the achievement job's last run.</summary>
public class AppSetting
{
    public required string Key { get; set; }
    public required string Value { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>Stored masteries, so the achievement job can read them without asking Riot.</summary>
public class ChampionMastery
{
    public required string Puuid { get; set; }
    public int ChampionId { get; set; }
    public int ChampionLevel { get; set; }
    public int ChampionPoints { get; set; }
    public DateTime UpdatedAt { get; set; }
}
