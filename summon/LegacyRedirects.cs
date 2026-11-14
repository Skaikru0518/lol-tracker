namespace summon;

/// <summary>Pre-redesign profile URLs that move for good, like the original's /summoner/[name]/[champion] page.</summary>
public static class LegacyRedirects
{
    // Profile segments with a page of their own; any other second segment is an old champion link
    private static readonly HashSet<string> Tabs = ["champions", "lp", "achievements", "live"];

    /// <summary>New path for an old /summoner/{name}/{champion} link, or null for any other path.</summary>
    public static string? ChampionPath(string path)
    {
        if (path.Split('/') is not ["", "summoner", var name, var champion] || name == "" || champion == "" || Tabs.Contains(champion))
            return null;
        // Decoded first, so an already encoded name is not encoded twice
        return $"/summoner/{Uri.EscapeDataString(Uri.UnescapeDataString(name))}/champions/{Uri.EscapeDataString(Uri.UnescapeDataString(champion))}";
    }
}
