namespace summon.Components.MatchPage;

/// <summary>Class strings the match page's panels share.</summary>
public static class MatchPageUi
{
    /// <summary>The small header toggle buttons (metric, filter), active or not.</summary>
    public static string Toggle(bool active) =>
        "h-6 rounded-md border px-2 text-xs font-medium transition-colors " +
        (active ? "border-primary/50 bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground");

    public const string Blue = "var(--color-team-blue)";
    public const string Red = "var(--color-team-red)";

    public static string TeamColor(string side) => side == "blue" ? Blue : Red;

    public static string SideName(string side) => side == "blue" ? "Blue" : "Red";
}
