using System.Globalization;
using System.Text.Json;

namespace summon.Changelog;

public record ChangeRequirement(string Name, string Requirement);

public record Change(string Category, string Title, string Description, string? Img, List<ChangeRequirement>? Table);

public record ChangelogEntry(string Slug, string Title, string Date, string Summary, List<Change> Changes);

public record CategoryMeta(string Label, string Plural, string Color);

/// <summary>
/// The changelog, newest first. changelog.json is the original's changes/*/metadata.ts entries in registry order;
/// regenerate it when the original adds one.
/// </summary>
public static class Changelogs
{
    public static readonly IReadOnlyList<ChangelogEntry> All = Load();

    private static List<ChangelogEntry> Load()
    {
        using var stream = typeof(Changelogs).Assembly.GetManifestResourceStream("summon.Changelog.changelog.json")
            ?? throw new InvalidOperationException("changelog.json is not embedded");
        return JsonSerializer.Deserialize<List<ChangelogEntry>>(stream, JsonSerializerOptions.Web) ?? [];
    }

    public static ChangelogEntry? Get(string slug) => All.FirstOrDefault(c => c.Slug == slug);

    private static readonly string[] Order = ["feature", "improvement", "design", "fix"];

    /// <summary>Label, plural heading and chip color (chart palette tokens) for each change category.</summary>
    public static readonly IReadOnlyDictionary<string, CategoryMeta> Categories = new Dictionary<string, CategoryMeta>
    {
        ["feature"] = new("Feature", "Features", "var(--color-chart-1)"),
        ["improvement"] = new("Improvement", "Improvements", "var(--color-chart-3)"),
        ["design"] = new("Design", "Design", "var(--color-chart-2)"),
        ["fix"] = new("Fix", "Fixes", "var(--color-chart-4)"),
    };

    /// <summary>Categories present in an entry with their change counts, in a fixed order.</summary>
    public static List<(string Category, int Count)> CategoryCounts(ChangelogEntry entry) =>
        Order.Select(category => (category, entry.Changes.Count(c => c.Category == category))).Where(c => c.Item2 > 0).ToList();

    /// <summary>An entry's changes grouped by category, same order as CategoryCounts.</summary>
    public static List<(string Category, List<Change> Items)> GroupChanges(ChangelogEntry entry) =>
        Order.Select(category => (category, entry.Changes.Where(c => c.Category == category).ToList())).Where(g => g.Item2.Count > 0).ToList();

    /// <summary>An entry's YYYY-MM-DD date as "Oct 13, 2026" (short) or "October 13, 2026" (long), never shifted by a time zone.</summary>
    public static string FormatDate(string iso, bool longMonth) =>
        DateOnly.ParseExact(iso, "yyyy-MM-dd", CultureInfo.InvariantCulture).ToString(longMonth ? "MMMM d, yyyy" : "MMM d, yyyy", CultureInfo.InvariantCulture);

    /// <summary>Count chip text such as "1 fix" or "3 features".</summary>
    public static string CategoryLabel(string category, int count)
    {
        var meta = Categories[category];
        return $"{count} {(count == 1 ? meta.Label : meta.Plural).ToLowerInvariant()}";
    }
}
