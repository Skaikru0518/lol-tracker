namespace summon.Data;

/// <summary>
/// Every scored player's performance in one match (Data, by puuid) and its score and grade alone (Summary), stored once the
/// role baselines it was scored against are calibrated and large enough to keep; finished games never change.
/// </summary>
public class MatchPerformance
{
    public required string MatchId { get; set; }
    public required string Data { get; set; }
    public required string Summary { get; set; }
    public DateTime CreatedAt { get; set; }
}
