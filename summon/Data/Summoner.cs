namespace summon.Data;

/// <summary>An account's summoner on its stored server: icon and level, refreshed in the background after five minutes.</summary>
public class Summoner
{
    public required string Puuid { get; set; }
    public int ProfileIconId { get; set; }
    public long SummonerLevel { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Account Account { get; set; } = null!;
}
