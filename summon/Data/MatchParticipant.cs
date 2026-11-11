namespace summon.Data;

public class MatchParticipant
{
    public required string MatchId { get; set; }
    public required string Puuid { get; set; }
    public required string ChampionName { get; set; }
    public bool Win { get; set; }
    public int Kills { get; set; }
    public int Deaths { get; set; }
    public int Assists { get; set; }
    public int Cs { get; set; }
    public int[] Items { get; set; } = [];
    public int Spell1 { get; set; }
    public int Spell2 { get; set; }

    public Match Match { get; set; } = null!;
}