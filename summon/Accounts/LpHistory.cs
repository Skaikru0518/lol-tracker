using summon.Data;
using summon.Riot;

namespace summon.Accounts;

public record LpSummary(LpSnapshot? Current, LpSnapshot? Peak, int? Change);

/// <summary>One snapshot with its LP delta from the one before; Kind is start, gain, loss, promotion, demotion, same or reset.</summary>
public record LpChangeRow(int Id, DateTime CreatedAt, string Tier, string Rank, int Lp, int? Wins, int? Losses, int? Delta, string Kind);

public record DailyLpPoint(DateOnly Day, int Value, LpSnapshot Snapshot);

public record LpDayGroup(DateOnly Day, LpChangeRow Latest, List<LpChangeRow> Rows, int? Delta, int Wins, int Losses);

/// <summary>The LP History tab's numbers, ported from the original's lp-history summary and range modules.</summary>
public static class LpHistory
{
    public static readonly DateTime SeasonStart = new(2026, 1, 8, 0, 0, 0, DateTimeKind.Utc);

    private static readonly string[] Tiers = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
    private static readonly string[] Divisions = ["IV", "III", "II", "I"];
    private const int ApexBase = 7 * 400;

    /// <summary>First instant of a range: "7d", "30d" or "season".</summary>
    public static DateTime RangeStart(string range, DateTime now) => range switch
    {
        "7d" => now.AddDays(-7),
        "30d" => now.AddDays(-30),
        _ => SeasonStart,
    };

    private static int Absolute(LpSnapshot s) => LpEstimate.ToAbsolute(s.Tier, s.Rank, s.Lp);

    private static int DivisionOrder(LpSnapshot s) => Array.IndexOf(Tiers, s.Tier) * Divisions.Length + Math.Max(Array.IndexOf(Divisions, s.Rank), 0);

    /// <summary>Snapshots whose tier is on the ladder; unknown tiers would read as 0 LP.</summary>
    private static List<LpSnapshot> KnownTiers(IEnumerable<LpSnapshot> snapshots) => snapshots.Where(s => Tiers.Contains(s.Tier)).ToList();

    /// <summary>Latest snapshot, highest snapshot and LP change from first to last (oldest-first input).</summary>
    public static LpSummary Summary(IEnumerable<LpSnapshot> all)
    {
        var snapshots = KnownTiers(all);
        if (snapshots.Count == 0) return new LpSummary(null, null, null);
        var current = snapshots[^1];
        var peak = snapshots.Aggregate((best, s) => Absolute(s) > Absolute(best) ? s : best);
        return new LpSummary(current, peak, snapshots.Count > 1 ? Absolute(current) - Absolute(snapshots[0]) : null);
    }

    /// <summary>Each snapshot with its LP delta and kind, newest first; a drop in the W/L totals is a season reset with no delta.</summary>
    public static List<LpChangeRow> ChangeRows(IEnumerable<LpSnapshot> all)
    {
        var snapshots = KnownTiers(all);
        var rows = new List<LpChangeRow>();
        for (var i = 0; i < snapshots.Count; i++)
        {
            var s = snapshots[i];
            var prev = i > 0 ? snapshots[i - 1] : null;
            var reset = prev is not null && s.Wins is { } w && s.Losses is { } l && prev.Wins is { } pw && prev.Losses is { } pl && (w < pw || l < pl);
            int? delta = prev is not null && !reset ? Absolute(s) - Absolute(prev) : null;
            var kind = reset ? "reset" : "start";
            if (prev is not null && delta is { } d)
            {
                // At equal absolute LP (Diamond I 100 -> Master 0, Master -> Grandmaster) the tier, then the division order decides
                if ($"{s.Tier} {s.Rank}" != $"{prev.Tier} {prev.Rank}")
                    kind = d > 0 || (d == 0 && DivisionOrder(s) > DivisionOrder(prev)) ? "promotion" : "demotion";
                else
                    kind = d > 0 ? "gain" : d < 0 ? "loss" : "same";
            }
            rows.Add(new LpChangeRow(s.Id, s.CreatedAt, s.Tier, s.Rank, s.Lp, s.Wins, s.Losses, delta, kind));
        }
        rows.Reverse();
        return rows;
    }

    /// <summary>Rank label for an absolute LP value, e.g. "Emerald I · 50 LP".</summary>
    public static string AbsoluteLabel(int value)
    {
        var v = Math.Max(0, value);
        if (v >= ApexBase) return $"Master+ · {v - ApexBase} LP";
        return $"{Ranks.Label(Tiers[v / 400], Divisions[v % 400 / 100])} · {v % 100} LP";
    }

    /// <summary>Y-axis ticks on 100 LP boundaries spanning min..max.</summary>
    public static List<int> AxisTicks(int min, int max)
    {
        var from = (int)Math.Floor(min / 100.0) * 100;
        var to = Math.Max((int)Math.Ceiling(max / 100.0) * 100, from + 100);
        var ticks = new List<int>();
        for (var v = from; v <= to; v += 100) ticks.Add(v);
        return ticks;
    }

    /// <summary>Y-axis tick label: the division below Master, Master+ at the line and plain LP above it.</summary>
    public static string AxisTickLabel(int value) => value > ApexBase ? $"{value - ApexBase} LP" : AbsoluteLabel(value).Split(" · ")[0];

    // shortcut: days follow the server's time zone, the original's follow the browser's; send the viewer's offset if they differ
    public static DateOnly DayOf(DateTime createdAt) => DateOnly.FromDateTime(createdAt.ToLocalTime());

    /// <summary>One point per day that has snapshots (that day's last), oldest first.</summary>
    public static List<DailyLpPoint> DailyPoints(IEnumerable<LpSnapshot> snapshots) =>
        KnownTiers(snapshots)
            .GroupBy(s => DayOf(s.CreatedAt))
            .Select(g => new DailyLpPoint(g.Key, Absolute(g.Last()), g.Last()))
            .ToList();

    /// <summary>
    /// Newest-first change rows grouped by day with net LP and W/L; W/L comes from the running totals when known
    /// (a reset counts its new-season totals), otherwise from the gain and loss kinds.
    /// </summary>
    public static List<LpDayGroup> GroupByDay(List<LpChangeRow> rows)
    {
        var groups = new List<(DateOnly Day, LpChangeRow Latest, List<LpChangeRow> Rows, int? Delta, int Wins, int Losses)>();
        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            var day = DayOf(row.CreatedAt);
            if (groups.Count == 0 || groups[^1].Day != day) groups.Add((day, row, [], null, 0, 0));
            var group = groups[^1];
            group.Rows.Add(row);
            if (row.Delta is { } delta) group.Delta = (group.Delta ?? 0) + delta;

            if (row.Kind == "reset")
            {
                group.Wins += row.Wins ?? 0;
                group.Losses += row.Losses ?? 0;
            }
            else if (row.Kind != "start")
            {
                var older = i + 1 < rows.Count ? rows[i + 1] : null;
                if (older is not null && row.Wins is { } w && row.Losses is { } l && older.Wins is { } ow && older.Losses is { } ol)
                {
                    group.Wins += w - ow;
                    group.Losses += l - ol;
                }
                else if (row.Kind is "gain" or "promotion") group.Wins += 1;
                else if (row.Kind is "loss" or "demotion") group.Losses += 1;
            }
            groups[^1] = group;
        }
        return groups.Select(g => new LpDayGroup(g.Day, g.Latest, g.Rows, g.Delta, g.Wins, g.Losses)).ToList();
    }

    /// <summary>Why the chart is not drawn for a number of charted days; null when it can be drawn.</summary>
    public static string? ChartNotice(int dayCount) => dayCount switch
    {
        0 => "No chartable snapshots in this range.",
        1 => "Played on one day so far.",
        _ => null,
    };
}
