namespace summon.Data;

/// <summary>A match's Riot timeline JSON, kept for 30 days after it was last fetched; older ones are fetched again on demand.</summary>
public class MatchTimeline
{
    public required string MatchId { get; set; }
    public required string Data { get; set; }
    public DateTime UpdatedAt { get; set; }
}
