using summon.Accounts;
using summon.Riot;

namespace summon.Widget;

/// <summary>The original's lib/widget: options, labels, refresh events, sessions and the sample data.</summary>
public static class WidgetLogic
{
    public static readonly string[] DefaultShow = ["id", "server", "lp", "wr"];

    private static string Pick(string? value, string[] allowed, string fallback) => value is not null && allowed.Contains(value) ? value : fallback;

    private static List<string> PickList(string? raw, string[] fallback, string[] allowed) =>
        raw is null ? [.. fallback] : raw.Split(',').Select(p => p.Trim()).Where(allowed.Contains).ToList();

    /// <summary>Options from a widget URL's query; each bad value falls back on its own, an explicit empty list stays empty.</summary>
    public static WidgetOptions ParseOptions(Func<string, string?> query) => new(
        Pick(query("style"), WidgetOptions.Styles, "bar"),
        Pick(query("theme"), WidgetOptions.Themes, "card"),
        Pick(query("queue"), WidgetOptions.Queues, "solo"),
        Pick(query("session"), WidgetOptions.Sessions, "auto"),
        PickList(query("show"), DefaultShow, WidgetOptions.Parts),
        Pick(query("anim"), WidgetOptions.Anims, "on"),
        PickList(query("fx"), [], WidgetOptions.Effects));

    public static readonly WidgetOptions Default = ParseOptions(_ => null);

    /// <summary>The widget URL's query, in the original's parameter order.</summary>
    public static string OptionsQuery(WidgetOptions o) =>
        string.Join('&', new[]
        {
            ("style", o.Style), ("theme", o.Theme), ("queue", o.Queue), ("session", o.Session),
            ("show", string.Join(',', o.Show)), ("anim", o.Anim), ("fx", string.Join(',', o.Fx)),
        }.Select(p => $"{p.Item1}={Uri.EscapeDataString(p.Item2)}"));

    private static readonly HashSet<string> Apex = ["MASTER", "GRANDMASTER", "CHALLENGER"];

    private static readonly Dictionary<string, string> ShortTier = new()
    {
        ["IRON"] = "I", ["BRONZE"] = "B", ["SILVER"] = "S", ["GOLD"] = "G", ["PLATINUM"] = "P",
        ["EMERALD"] = "E", ["DIAMOND"] = "D", ["MASTER"] = "M", ["GRANDMASTER"] = "GM", ["CHALLENGER"] = "C",
    };

    private static readonly Dictionary<string, int> DivisionNumber = new() { ["I"] = 1, ["II"] = 2, ["III"] = 3, ["IV"] = 4 };

    private static readonly Dictionary<string, string[]> StylePartsMap = new()
    {
        ["bar"] = ["id", "server", "lp", "wr"],
        ["square"] = ["id", "server", "lp", "wr"],
        ["strip"] = ["id", "server", "lp", "wr"],
        ["pill"] = ["lp", "wr"],
    };

    /// <summary>The OBS Browser Source size for each style.</summary>
    public static readonly IReadOnlyDictionary<string, (int Width, int Height)> StyleSizes = new Dictionary<string, (int, int)>
    {
        ["bar"] = (460, 88), ["square"] = (240, 310), ["strip"] = (520, 130), ["pill"] = (300, 36),
    };

    private static string Title(string s) => s[..1] + s[1..].ToLowerInvariant();

    public static string RankLabel(WidgetRank? rank) =>
        rank is null ? "Unranked" : Apex.Contains(rank.Tier) ? Title(rank.Tier) : $"{Title(rank.Tier)} {rank.Division}";

    public static string ShortRank(WidgetRank? rank)
    {
        if (rank is null) return "—";
        var tier = ShortTier.GetValueOrDefault(rank.Tier, rank.Tier);
        return Apex.Contains(rank.Tier) ? tier : $"{tier}{(DivisionNumber.TryGetValue(rank.Division, out var n) ? n : "")}";
    }

    // Math.round from JavaScript, as in the original
    public static int? WinRate(int wins, int losses) => wins + losses is var games and > 0 ? (int)Math.Floor(wins * 100.0 / games + 0.5) : null;

    public static string? WinRateLabel(int wins, int losses) => WinRate(wins, losses) is { } rate ? $"({rate}%)" : null;

    public static string LpChangeLabel(int change) => change > 0 ? $"+{change}" : change < 0 ? $"−{-change}" : "±0";

    /// <summary>The since the widget asks with: none for auto and season (the server finds it), the viewer's local midnight, or page load.</summary>
    public static long? SessionSince(string session, long loadedAt, long localMidnight) =>
        session switch { "today" => localMidnight, "load" => loadedAt, _ => null };

    public static bool ShowsPart(string style, IEnumerable<string> show, string part) => StylePartsMap[style].Contains(part) && show.Contains(part);

    public static IReadOnlyList<string> StyleParts(string style) => StylePartsMap[style];

    /// <summary>What the widget data is fetched with for these options; the strip also shows the live game.</summary>
    public static WidgetQuery Query(WidgetOptions options, long loadedAt, long localMidnight) =>
        new(options.Queue, SessionSince(options.Session, loadedAt, localMidnight), options.Session == "season", options.Style == "strip");

    public static int TrailingWinStreak(IReadOnlyList<WidgetGame> games)
    {
        var streak = 0;
        for (var i = games.Count - 1; i >= 0 && games[i].Win; i--) streak++;
        return streak;
    }

    private static int Absolute(WidgetRank r) => LpEstimate.ToAbsolute(r.Tier, r.Division, r.LeaguePoints);

    /// <summary>What changed between two refreshes: new games, the newest result, LP moved, and a promotion or demotion.</summary>
    public static WidgetEvents Events(WidgetData? prev, WidgetData next)
    {
        if (prev is null) return WidgetEvents.None;
        var known = prev.Games.Select(g => g.MatchId).ToHashSet();
        var fresh = next.Games.Where(g => !known.Contains(g.MatchId)).ToList();
        var newest = fresh.LastOrDefault();

        int? lpDelta = null;
        string? rank = null;
        if (prev.Rank is not null && next.Rank is not null)
        {
            var delta = Absolute(next.Rank) - Absolute(prev.Rank);
            if (delta != 0) lpDelta = delta;
            if (prev.Rank.Tier != next.Rank.Tier || prev.Rank.Division != next.Rank.Division) rank = delta > 0 ? "up" : "down";
        }
        return new WidgetEvents(fresh.Select(g => g.MatchId).ToList(), newest is null ? null : newest.Win ? "win" : "loss", lpDelta, rank);
    }

    public static readonly long AutoSessionGapMs = (long)TimeSpan.FromHours(3).TotalMilliseconds;

    /// <summary>The player's games in the queue since the start, oldest first, without remakes or games they are not in.</summary>
    public static List<WidgetGame> SessionGames(IEnumerable<RiotMatch> matches, string puuid, int queueId, long sinceMs) =>
        matches
            .Where(m => m.Info.QueueId == queueId && m.Info.GameCreation >= sinceMs && !Queues.IsRemake(m.Info.GameDuration))
            .SelectMany(m => m.Info.Participants.Where(p => p.Puuid == puuid).Take(1).Select(p => new WidgetGame(
                m.Metadata.MatchId, p.ChampionName, p.Win, p.Kills, p.Deaths, p.Assists,
                m.Info.GameCreation, m.Info.GameCreation + m.Info.GameDuration * 1000L)))
            .OrderBy(g => g.Start)
            .ToList();

    /// <summary>The newest run of games (oldest first) where each gap is under gapMs; empty once the last game is gapMs old.</summary>
    public static List<WidgetGame> AutoSession(IReadOnlyList<WidgetGame> games, long now, long gapMs)
    {
        if (games.Count == 0 || now - games[^1].End >= gapMs) return [];
        var first = games.Count - 1;
        while (first > 0 && games[first].Start - games[first - 1].End < gapMs) first--;
        return games.Skip(first).ToList();
    }

    /// <summary>Only exact: the baseline must sit right before the session's first game, which its W/L proves.</summary>
    public static int? SessionLpChange(LpPoint? baseline, LpPoint current, IReadOnlyList<WidgetGame> games)
    {
        if (baseline is null || games.Count == 0) return null;
        if (baseline.Wins is null || baseline.Losses is null || current.Wins is null || current.Losses is null) return null;
        if (baseline.Wins + baseline.Losses + games.Count != current.Wins + current.Losses) return null;
        return LpEstimate.ToAbsolute(current.Tier, current.Rank, current.Lp) - LpEstimate.ToAbsolute(baseline.Tier, baseline.Rank, baseline.Lp);
    }

    private const long Hour = 60 * 60 * 1000;

    private static readonly List<WidgetGame> SampleGames = new (string Champion, bool Win, int K, int D, int A)[]
    {
        ("Ahri", true, 7, 2, 9), ("Ahri", true, 11, 4, 6), ("Sylas", false, 3, 6, 4), ("Ahri", true, 8, 1, 12),
        ("Orianna", true, 4, 2, 15), ("Ahri", false, 5, 7, 3), ("Ahri", true, 9, 3, 7),
    }.Select((g, i) => new WidgetGame($"sample-{i}", g.Champion, g.Win, g.K, g.D, g.A, i * Hour, i * Hour + Hour / 2)).ToList();

    /// <summary>The made-up player of the home page promo and the generator's sample session.</summary>
    public static readonly WidgetData Sample = new(
        "Velmora", "MOON", "euw", new WidgetRank("GRANDMASTER", "I", 412), "session",
        new WidgetRecord(5, 2), new WidgetRecord(214, 171), SampleGames, 38, "Ahri", null);

    /// <summary>The generator preview needs games to judge the strip and dots; an empty real session gets sample ones.</summary>
    public static (WidgetData Data, bool Sample) WithSampleSession(WidgetData data)
    {
        if (data.Games.Count > 0) return (data, false);
        var withGames = data with { Games = SampleGames, LiveChampion = Sample.LiveChampion };
        // A season view keeps its real record; only the game icons are samples
        if (data.Scope == "season") return (withGames, true);
        return (withGames with { Record = Sample.Record, LpChange = Sample.LpChange }, true);
    }
}
