using System.Globalization;

namespace summon.Components.Ui;

public static class Format
{
    public static string Duration(int seconds)
    {
        var total = Math.Max(0, seconds);
        return $"{total / 60}:{total % 60:00}";
    }

    /// <summary>13.8k from 1000 up, the number itself below.</summary>
    public static string Thousands(int value) =>
        value >= 1000 ? (value / 1000.0).ToString("0.0", CultureInfo.InvariantCulture) + "k" : value.ToString(CultureInfo.InvariantCulture);

    /// <summary>Mastery points: 980, 412k, 1.25M.</summary>
    public static string Points(int points) => points switch
    {
        >= 1_000_000 => (Math.Floor(points / 10_000.0 + 0.5) / 100).ToString(CultureInfo.InvariantCulture) + "M",
        >= 1_000 => Math.Floor(points / 1_000.0 + 0.5).ToString(CultureInfo.InvariantCulture) + "k",
        _ => points.ToString(CultureInfo.InvariantCulture),
    };

    /// <summary>Just now, 15m ago, 3h ago, 4d ago; minutes round down to five.</summary>
    public static string TimeAgo(long timestampMs)
    {
        var minutes = (DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - timestampMs) / 60_000;
        if (minutes < 5) return "Just now";
        if (minutes < 60) return $"{minutes / 5 * 5}m ago";
        var hours = minutes / 60;
        return hours < 24 ? $"{hours}h ago" : $"{hours / 24}d ago";
    }

    /// <summary>(kills + assists) / deaths to two decimals; null means perfect (no deaths).</summary>
    public static string? Kda(int kills, int deaths, int assists) =>
        deaths == 0 ? null : Math.Round((kills + assists) / (double)deaths, 2, MidpointRounding.AwayFromZero).ToString(CultureInfo.InvariantCulture);

    public static string CsPerMinute(int cs, int durationSeconds) =>
        durationSeconds <= 0 ? "0" : Math.Round(cs / (durationSeconds / 60.0), 1, MidpointRounding.AwayFromZero).ToString(CultureInfo.InvariantCulture);

    public static int Percent(int part, int whole) =>
        whole == 0 ? 0 : (int)Math.Round(100.0 * part / whole, MidpointRounding.AwayFromZero);

    public static string SummonerSlug(string? gameName, string? tagLine) => Uri.EscapeDataString($"{gameName}-{tagLine}");
}
