using summon.Riot;
using summon.Widget;

namespace summon.Components.Widget;

/// <summary>Small helpers the widget views share, the original's widget-parts functions.</summary>
public static class WidgetView
{
    public const int StreakMin = 3;

    private static readonly HashSet<string> Emblems =
        ["iron", "bronze", "silver", "gold", "platinum", "emerald", "diamond", "master", "grandmaster", "challenger"];

    public static string? TierColor(WidgetData data) => data.Rank is null ? null : Ranks.Color(data.Rank.Tier);

    public static int WinStreak(WidgetData data) => WidgetLogic.TrailingWinStreak(data.Games);

    public static string RecordLabel(WidgetData data) => data.Scope == "season" ? "Season" : "Session";

    public static string EmblemSrc(string? tier) =>
        $"/icons/rank/{(tier?.ToLowerInvariant() is { } key && Emblems.Contains(key) ? key : "unranked")}.png";
}
