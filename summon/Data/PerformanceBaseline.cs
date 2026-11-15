namespace summon.Data;

/// <summary>Per-role metric quantiles and calibration from the daily baseline job; scores are ranked against the newest row.</summary>
public class PerformanceBaseline
{
    public long Id { get; set; }
    public DateTime ComputedAt { get; set; }
    public int SampleSize { get; set; }
    public required string Data { get; set; }
}
