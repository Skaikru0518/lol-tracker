namespace summon.Data;

/// <summary>A ranked state at one moment; consecutive snapshots give the LP change of the games between them.</summary>
public class LpSnapshot
{
    public int Id { get; set; }
    public required string Puuid { get; set; }
    public required string QueueType { get; set; }
    public required string Tier { get; set; }
    public required string Rank { get; set; }
    public int Lp { get; set; }
    public int? Wins { get; set; }
    public int? Losses { get; set; }
    public DateTime CreatedAt { get; set; }

    public Account Account { get; set; } = null!;
}
