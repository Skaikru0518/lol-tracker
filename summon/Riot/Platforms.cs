namespace summon.Riot;

/// <summary>The servers Summon.gg tracks: keys are what the search picker stores, hosts what Riot URLs and Account.Platform use.</summary>
public static class Platforms
{
    public record Platform(string Key, string Host, string Label);

    public static readonly Platform[] All = [new("eune", "eun1", "EUNE"), new("euw", "euw1", "EUW")];

    public const string DefaultKey = "eune";

    /// <summary>A stored picker value, or the default for anything unknown.</summary>
    public static Platform ByKey(string? key) => All.FirstOrDefault(p => p.Key == key) ?? All.First(p => p.Key == DefaultKey);

    /// <summary>The tracked platform behind a Riot host or region such as "EUN1"; null for servers Summon.gg does not track.</summary>
    public static Platform? ByHost(string? host) => All.FirstOrDefault(p => string.Equals(p.Host, host, StringComparison.OrdinalIgnoreCase));
}
