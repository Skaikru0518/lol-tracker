namespace summon.Accounts;

public record HeatmapCell(int Day, int Slot, int Wins, int Games);

/// <summary>Ranked win rate by Budapest weekday and 3-hour slot, ported from the original's lp-history heatmap module.</summary>
public static class WinrateHeatmap
{
    public static readonly string[] Days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    public const int SlotHours = 3;
    public const int SlotCount = 24 / SlotHours;

    /// <summary>Fewest games before a cell shows a win rate.</summary>
    public const int MinCellGames = 3;
    /// <summary>Fewest games for a slot to count as the best or worst one.</summary>
    public const int MinExtremeGames = 5;
    /// <summary>Games at which a cell reaches full color.</summary>
    private const int FullConfidenceGames = 10;

    private static readonly TimeZoneInfo Budapest = TimeZoneInfo.FindSystemTimeZoneById("Europe/Budapest");

    /// <summary>Weekday (Monday 0) and 3-hour slot of a game start in Budapest time.</summary>
    public static (int Day, int Slot) BudapestSlot(long timestampMs)
    {
        var local = TimeZoneInfo.ConvertTime(DateTimeOffset.FromUnixTimeMilliseconds(timestampMs), Budapest);
        return (((int)local.DayOfWeek + 6) % 7, local.Hour / SlotHours);
    }

    /// <summary>Wins and games for every weekday × slot cell (7 × 8), Monday first.</summary>
    public static List<HeatmapCell> Cells(IEnumerable<(long GameCreation, bool Win)> games)
    {
        var wins = new int[Days.Length * SlotCount];
        var counts = new int[Days.Length * SlotCount];
        foreach (var (creation, win) in games)
        {
            var (day, slot) = BudapestSlot(creation);
            counts[day * SlotCount + slot]++;
            if (win) wins[day * SlotCount + slot]++;
        }
        return Enumerable.Range(0, Days.Length * SlotCount).Select(i => new HeatmapCell(i / SlotCount, i % SlotCount, wins[i], counts[i])).ToList();
    }

    /// <summary>Win rate (whole percent) and color confidence (0..1) of a cell; null below the minimum games.</summary>
    public static (int WinRate, double Confidence)? Tone(HeatmapCell cell) =>
        cell.Games < MinCellGames ? null : ((int)Math.Floor(100.0 * cell.Wins / cell.Games + 0.5), Math.Min(cell.Games / (double)FullConfidenceGames, 1));

    private static double Rate(HeatmapCell c) => (double)c.Wins / c.Games;

    /// <summary>Best and worst slot by win rate among cells with enough games (more games wins a tie); null when they don't differ.</summary>
    public static (HeatmapCell Best, HeatmapCell Worst)? Extremes(List<HeatmapCell> cells)
    {
        var qualified = cells.Where(c => c.Games >= MinExtremeGames).ToList();
        if (qualified.Count < 2) return null;
        var best = qualified.OrderByDescending(Rate).ThenByDescending(c => c.Games).First();
        var worst = qualified.OrderBy(Rate).ThenByDescending(c => c.Games).First();
        return Rate(best) == Rate(worst) ? null : (best, worst);
    }

    /// <summary>"18–21" for slot 6.</summary>
    public static string SlotLabel(int slot) => $"{slot * SlotHours}–{(slot + 1) * SlotHours}";
}
