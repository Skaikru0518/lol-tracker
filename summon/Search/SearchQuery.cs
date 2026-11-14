using System.Text.Json;
using System.Text.Json.Nodes;
using summon.Riot;

namespace summon.Search;

public record SearchTerms(string Name, string? Tag);

public record RiotId(string GameName, string TagLine);

/// <summary>A stored summoner offered while typing; Platform is the Riot host, e.g. eun1.</summary>
public record SearchSuggestion(string Puuid, string GameName, string TagLine, string Platform, int? ProfileIconId, string? SoloTier, string? SoloRank, int? SoloLp);

public enum SuggestionStatus { Results, Pending, Error, Empty }

public static class SearchQuery
{
    private const int MinName = 2;
    private const int MaxInput = 40;

    /// <summary>Typed search text as a name prefix and optional tag prefix; null below two name characters.</summary>
    public static SearchTerms? ParseTerms(string raw)
    {
        var text = raw.Trim();
        if (text.Length > MaxInput) text = text[..MaxInput];
        var separator = text.IndexOf('#');
        var name = (separator == -1 ? text : text[..separator]).Trim();
        if (name.Length < MinName) return null;
        var tag = separator == -1 ? "" : text[(separator + 1)..].Trim();
        return new SearchTerms(name, tag == "" ? null : tag);
    }

    /// <summary>"Name#TAG" split and trimmed; null without a name or a tag.</summary>
    public static RiotId? ParseRiotId(string input)
    {
        var separator = input.IndexOf('#');
        if (separator == -1) return null;
        var gameName = input[..separator].Trim();
        var tagLine = input[(separator + 1)..].Trim();
        return gameName == "" || tagLine == "" ? null : new RiotId(gameName, tagLine);
    }

    /// <summary>A full Name#TAG the results don't already contain, to offer as a Riot lookup; null otherwise.</summary>
    public static RiotId? LookupCandidate(string raw, IEnumerable<SearchSuggestion> results)
    {
        if (ParseRiotId(raw.Trim()) is not { } riotId) return null;
        var listed = results.Any(r =>
            string.Equals(r.GameName, riotId.GameName, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(r.TagLine, riotId.TagLine, StringComparison.OrdinalIgnoreCase));
        return listed ? null : riotId;
    }

    /// <summary>Text for a LIKE pattern with %, _ and the \ escape character escaped, so it matches literally.</summary>
    public static string LikeLiteral(string text) => text.Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_");

    /// <summary>Exact-name matches first, then prefix matches not already listed, capped at limit.</summary>
    public static List<T> MergeExactFirst<T>(IReadOnlyList<T> exact, IEnumerable<T> prefix, Func<T, string> key, int limit)
    {
        var seen = exact.Select(key).ToHashSet();
        return exact.Concat(prefix.Where(r => !seen.Contains(key(r)))).Take(limit).ToList();
    }

    /// <summary>What the suggestion dropdown shows: rows when there are any, else a searching, error or no-match line.</summary>
    public static SuggestionStatus Status(bool pending, bool isError, int resultCount, bool hasLookup) =>
        resultCount > 0 || hasLookup ? SuggestionStatus.Results
        : pending ? SuggestionStatus.Pending
        : isError ? SuggestionStatus.Error
        : SuggestionStatus.Empty;

    /// <summary>"Gold II · 40 LP", or Unranked.</summary>
    public static string RankLabel(SearchSuggestion r) =>
        r.SoloTier is null ? "Unranked"
        : r.SoloLp is null ? Ranks.Label(r.SoloTier, r.SoloRank ?? "I")
        : $"{Ranks.Label(r.SoloTier, r.SoloRank ?? "I")} · {r.SoloLp} LP";

    private const int MaxHistory = 10;

    /// <summary>
    /// The stored search history, newest first, in the original's localStorage format; anything that is not a JSON array is no history.
    /// Entries saved before EUW support are plain "Name#TAG" strings, all from EUNE.
    /// </summary>
    public static List<(string RiotId, string Platform)> ParseHistory(string? raw)
    {
        var entries = new List<(string RiotId, string Platform)>();
        try
        {
            if (raw is not null && JsonNode.Parse(raw) is JsonArray array)
            {
                foreach (var item in array)
                {
                    if (item is JsonValue value && value.TryGetValue<string>(out var plain)) entries.Add((plain, Platforms.DefaultKey));
                    else if (item is JsonObject obj && obj["riotId"]?.GetValueKind() == JsonValueKind.String && obj["platform"]?.GetValueKind() == JsonValueKind.String
                             && Platforms.All.Any(p => p.Key == (string)obj["platform"]!))
                        entries.Add(((string)obj["riotId"]!, (string)obj["platform"]!));
                }
            }
        }
        catch (JsonException)
        {
            return [];
        }
        return entries;
    }

    /// <summary>The stored history with riotId moved to the front, capped at ten.</summary>
    public static string AddToHistory(string? raw, string riotId, string platformKey)
    {
        var entries = ParseHistory(raw);
        entries.RemoveAll(e => e.RiotId == riotId);
        entries.Insert(0, (riotId, platformKey));
        return JsonSerializer.Serialize(entries.Take(MaxHistory).Select(e => new { riotId = e.RiotId, platform = e.Platform }));
    }

    /// <summary>
    /// Search picker first, then the stored platform, and only then Riot's active region; each must have a summoner.
    /// Returns the first host that has one, or null.
    /// </summary>
    public static async Task<string?> LocatePlatformAsync(string? hint, string? stored, Func<string, Task<bool>> hasSummoner, Func<Task<string?>> activeRegion)
    {
        var tried = new HashSet<string>();
        async Task<string?> Attempt(string? host)
        {
            if (host is null || !tried.Add(host)) return null;
            return await hasSummoner(host) ? host : null;
        }
        return await Attempt(hint) ?? await Attempt(stored) ?? await Attempt(Platforms.ByHost(await activeRegion())?.Host);
    }
}
