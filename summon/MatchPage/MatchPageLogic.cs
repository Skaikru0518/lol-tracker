using System.Globalization;
using System.Text.RegularExpressions;
using summon.Components.MatchDetails;
using summon.Components.Ui;
using summon.Riot;

namespace summon.MatchPage;

public record PlayerShares(int DamageShare, int GoldShare, int KillParticipation, double CsPerMin, int VisionScore);

public record StatLine(string Label, string Value);

public record PlayerStatGroups(List<StatLine> Damage, List<StatLine> Survivability, List<StatLine> Income, List<StatLine> Vision, List<StatLine> Combat);

public record ComparisonEntry(string Puuid, string ChampionName, int Value);

public record ComparisonRows(List<ComparisonEntry> Blue, List<ComparisonEntry> Red, int Max, string? TopPuuid);

/// <summary>The original's lib/match detail, comparison and runes helpers.</summary>
public static partial class MatchPageLogic
{
    /// <summary>Player the selector starts on: the ?puuid player when they played, else the first participant.</summary>
    public static string DefaultSelectedPuuid(RiotMatch match, string? puuid) =>
        match.Info.Participants.FirstOrDefault(p => p.Puuid == puuid)?.Puuid ?? match.Info.Participants.FirstOrDefault()?.Puuid ?? "";

    /// <summary>Timeline participant id (1-10): position in info.participants plus one; null when absent.</summary>
    public static int? ParticipantIdOf(RiotMatch match, string puuid) =>
        match.Info.Participants.FindIndex(p => p.Puuid == puuid) is var i and >= 0 ? i + 1 : null;

    private static int PercentOf(long value, long total) => total > 0 ? (int)Math.Floor(value * 100.0 / total + 0.5) : 0;

    // Math.round from JavaScript, to one decimal
    public static double CsPerMinute(int cs, int durationSeconds) =>
        durationSeconds <= 0 ? 0 : Math.Floor(cs / (durationSeconds / 60.0) * 10 + 0.5) / 10;

    public static int KillParticipation(RiotParticipant player, IEnumerable<RiotParticipant> participants)
    {
        var teamKills = participants.Where(p => p.TeamId == player.TeamId).Sum(p => p.Kills);
        return teamKills == 0 ? 0 : (int)Math.Floor((player.Kills + player.Assists) * 100.0 / teamKills + 0.5);
    }

    /// <summary>Share of the player's team damage and gold, kill participation, CS per minute and vision score.</summary>
    public static PlayerShares Shares(RiotMatch match, RiotParticipant player)
    {
        var team = match.Info.Participants.Where(p => p.TeamId == player.TeamId).ToList();
        return new PlayerShares(
            PercentOf(player.TotalDamageDealtToChampions, team.Sum(p => (long)p.TotalDamageDealtToChampions)),
            PercentOf(player.GoldEarned, team.Sum(p => (long)p.GoldEarned)),
            KillParticipation(player, match.Info.Participants),
            CsPerMinute(player.TotalMinionsKilled + player.NeutralMinionsKilled, match.Info.GameDuration),
            player.VisionScore);
    }

    private static string Number(long n) => n.ToString("N0", CultureInfo.InvariantCulture);

    /// <summary>The player's detailed stats grouped for the player tabs; per-minute values are 0 for a zero duration.</summary>
    public static PlayerStatGroups StatGroups(RiotParticipant p, ParticipantDetail? d, int durationSeconds)
    {
        var minutes = durationSeconds / 60.0;
        string PerMinute(long n) => minutes > 0 ? Number((long)Math.Floor(n / minutes + 0.5)) : "0";
        var cs = p.TotalMinionsKilled + p.NeutralMinionsKilled;
        var multikills = new[] { (d?.DoubleKills ?? 0, "Double"), (d?.TripleKills ?? 0, "Triple"), (p.QuadraKills, "Quadra"), (p.PentaKills, "Penta") }
            .Where(m => m.Item1 > 0).Select(m => $"{m.Item1}× {m.Item2}").ToList();

        List<StatLine> combat =
        [
            new("Largest spree", Number(d?.LargestKillingSpree ?? 0)),
            .. multikills.Count > 0 ? [new StatLine("Multikills", string.Join(", ", multikills))] : Array.Empty<StatLine>(),
            new("Turrets", Number(p.TurretKills)),
            new("Dragons", Number(p.DragonKills)),
            new("Barons", Number(p.BaronKills)),
            new("CC time", Format.Duration(p.TimeCCingOthers)),
            new("Time dead", Format.Duration(d?.TotalTimeSpentDead ?? 0)),
            .. p.FirstBloodKill ? [new StatLine("First blood", "Yes")] : Array.Empty<StatLine>(),
            .. d?.FirstTowerKill == true ? [new StatLine("First tower", "Yes")] : Array.Empty<StatLine>(),
        ];

        return new PlayerStatGroups(
            [
                new("To champions", Number(p.TotalDamageDealtToChampions)),
                new("Physical", Number(d?.PhysicalDamageDealtToChampions ?? 0)),
                new("Magic", Number(d?.MagicDamageDealtToChampions ?? 0)),
                new("True", Number(d?.TrueDamageDealtToChampions ?? 0)),
                new("DPM", PerMinute(p.TotalDamageDealtToChampions)),
            ],
            [
                new("Damage taken", Number(p.TotalDamageTaken)),
                new("Self mitigated", Number(d?.DamageSelfMitigated ?? 0)),
                new("Healing", Number(d?.TotalHeal ?? 0)),
                new("Shielded allies", Number(d?.TotalDamageShieldedOnTeammates ?? 0)),
                new("Healed allies", Number(p.TotalHealsOnTeammates)),
            ],
            [
                new("Gold", Number(p.GoldEarned)),
                new("Gold/min", PerMinute(p.GoldEarned)),
                new("CS", Number(cs)),
                new("CS/min", CsPerMinute(cs, durationSeconds).ToString(CultureInfo.InvariantCulture)),
            ],
            [
                new("Vision score", Number(p.VisionScore)),
                new("Wards placed", Number(p.WardsPlaced)),
                new("Wards killed", Number(p.WardsKilled)),
                new("Control wards", Number(p.VisionWardsBoughtInGame)),
            ],
            combat);
    }

    public static readonly (string Id, string Label)[] ComparisonMetrics =
        [("damage", "Damage"), ("gold", "Gold"), ("vision", "Vision"), ("cs", "CS"), ("taken", "Taken")];

    private static int MetricValue(RiotParticipant p, string metric) => metric switch
    {
        "gold" => p.GoldEarned,
        "vision" => p.VisionScore,
        "cs" => p.TotalMinionsKilled + p.NeutralMinionsKilled,
        "taken" => p.TotalDamageTaken,
        _ => p.TotalDamageDealtToChampions,
    };

    /// <summary>Both teams' values for one metric in scoreboard order, the largest value (at least 1) to scale bars by, and who holds it.</summary>
    public static ComparisonRows Comparison(RiotMatch match, string metric)
    {
        ComparisonEntry Entry(RiotParticipant p) => new(p.Puuid, p.ChampionName, MetricValue(p, metric));
        var blue = TeamSummary.Players(match, 100).Select(Entry).ToList();
        var red = TeamSummary.Players(match, 200).Select(Entry).ToList();
        var max = Math.Max(1, blue.Concat(red).Select(e => e.Value).DefaultIfEmpty(0).Max());
        var top = blue.Concat(red).FirstOrDefault(e => e.Value == max && e.Value > 0);
        return new ComparisonRows(blue, red, max, top?.Puuid);
    }

    [GeneratedRegex(@"<br\s*/?>", RegexOptions.IgnoreCase)]
    private static partial Regex LineBreak();

    [GeneratedRegex(@"<[^>]+>")]
    private static partial Regex Tag();

    [GeneratedRegex(@"\s+")]
    private static partial Regex Spaces();

    [GeneratedRegex(@"@eogvar([123])@")]
    private static partial Regex EogVar();

    /// <summary>Rune text without markup: tags removed, line breaks as spaces, whitespace collapsed.</summary>
    public static string PlainText(string html) => Spaces().Replace(Tag().Replace(LineBreak().Replace(html, " "), ""), " ").Trim();

    /// <summary>A rune's end-of-game stat lines with @eogvarN@ replaced by the match values.</summary>
    public static List<string> RuneStatLines(PerkInfo? perk, int[] vars) =>
        perk is null ? [] : perk.EndOfGameStatDescs
            .Select(line => PlainText(EogVar().Replace(line, m => vars[int.Parse(m.Groups[1].Value) - 1].ToString("N0", CultureInfo.InvariantCulture))))
            .ToList();
}
