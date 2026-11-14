namespace summon.Widget;

/// <summary>What a widget URL asks for; every value is one of the lists in <see cref="WidgetOptions"/>.</summary>
public record WidgetOptions(string Style, string Theme, string Queue, string Session, IReadOnlyList<string> Show, string Anim, IReadOnlyList<string> Fx)
{
    public static readonly string[] Styles = ["bar", "square", "strip", "pill"];
    public static readonly string[] Themes = ["card", "clear"];
    public static readonly string[] Queues = ["solo", "flex"];
    public static readonly string[] Sessions = ["auto", "today", "load", "season"];
    public static readonly string[] Parts = ["id", "server", "lp", "wr"];
    public static readonly string[] Anims = ["on", "off"];
    public static readonly string[] Effects = ["rotate", "smoke"];

    public bool Animated => Anim == "on";
    public bool HasFx(string fx) => Fx.Contains(fx);
}

public record WidgetGame(string MatchId, string ChampionName, bool Win, int Kills, int Deaths, int Assists, long Start, long End);

public record WidgetRank(string Tier, string Division, int LeaguePoints);

public record WidgetRecord(int Wins, int Losses);

/// <summary>Platform is the picker key (eune, euw); Scope is session or season.</summary>
public record WidgetData(
    string GameName,
    string TagLine,
    string Platform,
    WidgetRank? Rank,
    string Scope,
    WidgetRecord Record,
    WidgetRecord? Season,
    IReadOnlyList<WidgetGame> Games,
    int? LpChange,
    string? LiveChampion,
    long? LiveStartedAt);

/// <summary>What changed between two refreshes, so the widget knows which animations to play; Nonce re-keys them so each replays.</summary>
public record WidgetEvents(IReadOnlyList<string> NewGames, string? Result, int? LpDelta, string? Rank, long Nonce = 0)
{
    public static readonly WidgetEvents None = new([], null, null, null);

    public bool Any => NewGames.Count > 0 || LpDelta is not null || Rank is not null;
}

/// <summary>What the widget data asks for: the queue, a session start (none for auto), the season view, and the live game (strip only).</summary>
public record WidgetQuery(string Queue, long? Since, bool Season, bool Live);

public record LpPoint(string Tier, string Rank, int Lp, int? Wins, int? Losses);
