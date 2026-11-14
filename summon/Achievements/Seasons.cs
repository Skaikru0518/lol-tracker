namespace summon.Achievements;

public record Season(string Id, string Label, DateTime Start);

public static class Seasons
{
    /// <summary>Riot ranked years, oldest first; a new reset is one more line.</summary>
    public static readonly Season[] All =
    [
        new("2025", "Season 2025", new DateTime(2025, 1, 9, 11, 0, 0, DateTimeKind.Utc)),
        new("2026", "Season 2026", new DateTime(2026, 1, 8, 11, 0, 0, DateTimeKind.Utc)),
    ];

    /// <summary>A season runs until the next one starts; the last one is open-ended.</summary>
    public static TimeRange Range(Season season)
    {
        var index = Array.FindIndex(All, s => s.Id == season.Id);
        return new TimeRange(season.Start, index + 1 < All.Length ? All[index + 1].Start : null);
    }

    /// <summary>The season the date falls in; null before the first one.</summary>
    public static Season? For(DateTime date) => All.LastOrDefault(s => s.Start <= date);

    /// <summary>The latest season that has started (the first one before any has).</summary>
    public static Season Current(DateTime now) => For(now) ?? All[0];
}

public record TimeRange(DateTime From, DateTime? To)
{
    public bool Contains(DateTime date) => date >= From && (To is null || date < To);
    public bool Contains(long timestampMs) => Contains(DateTimeOffset.FromUnixTimeMilliseconds(timestampMs).UtcDateTime);
}
