using System.Text.Json;

namespace summon.Home;

public record CachedRotation(DateTime FetchedAt, List<int> FreeChampionIds);

public enum CacheState { Fresh, Stale, Missing }

public record NewSkin(int Id, string Name, string Rarity, string Splash);

public record NewSkins(string Patch, List<NewSkin> Skins);

/// <summary>CommunityDragon skins.json entry, only the fields read; fields it leaves out stay null.</summary>
public record RawSkin(int Id, string? Name, bool IsBase, string? Rarity, string? SplashPath);

public record CachedSkins(string Patch, DateTime FetchedAt, List<NewSkin> Skins);

/// <summary>The home page's free rotation and new skins: Riot and CommunityDragon responses, and when their cached copies go stale.</summary>
public static class HomeFeeds
{
    private static readonly TimeSpan SwapWindow = TimeSpan.FromHours(36);
    private static readonly TimeSpan SwapRecheck = TimeSpan.FromHours(6);
    private static readonly TimeSpan SkinsMaxAge = TimeSpan.FromDays(7);

    /// <summary>Most recent Tuesday 00:00 UTC at or before now, when the weekly free rotation changes.</summary>
    public static DateTime LastRotationReset(DateTime now)
    {
        var midnight = now.Date;
        var daysSince = ((int)now.DayOfWeek - (int)DayOfWeek.Tuesday + 7) % 7;
        return DateTime.SpecifyKind(midnight.AddDays(-daysSince), DateTimeKind.Utc);
    }

    /// <summary>Stored rotation; anything invalid counts as missing.</summary>
    public static CachedRotation? ParseCachedRotation(string? raw)
    {
        if (string.IsNullOrEmpty(raw)) return null;
        try
        {
            using var doc = JsonDocument.Parse(raw);
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Object
                || !root.TryGetProperty("fetchedAt", out var at) || at.ValueKind != JsonValueKind.String
                || !DateTime.TryParse(at.GetString(), null, System.Globalization.DateTimeStyles.AdjustToUniversal | System.Globalization.DateTimeStyles.AssumeUniversal, out var fetchedAt)
                || !root.TryGetProperty("freeChampionIds", out var ids) || ids.ValueKind != JsonValueKind.Array
                || ids.EnumerateArray().Any(id => id.ValueKind != JsonValueKind.Number))
                return null;
            return new CachedRotation(fetchedAt, ids.EnumerateArray().Select(id => id.GetInt32()).ToList());
        }
        catch (JsonException)
        {
            return null;
        }
    }

    public static string SerializeRotation(IEnumerable<int> freeChampionIds, DateTime now) =>
        JsonSerializer.Serialize(new { fetchedAt = now.ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'"), freeChampionIds });

    /// <summary>Valid until the next Tuesday reset, re-checked every 6 h in the 36 h after one, when Riot may still swap it; a future timestamp counts as stale.</summary>
    public static CacheState RotationCacheState(CachedRotation? cached, DateTime now)
    {
        if (cached is null) return CacheState.Missing;
        var age = now - cached.FetchedAt;
        var reset = LastRotationReset(now);
        if (age < TimeSpan.Zero || cached.FetchedAt < reset) return CacheState.Stale;
        if (now - reset < SwapWindow && age >= SwapRecheck) return CacheState.Stale;
        return CacheState.Fresh;
    }

    /// <summary>Riot's champion-v3 response, current ({sr}) or pre-2026 ({freeChampionIds}) shape, to the free ids; throws on anything else.</summary>
    public static List<int> ToFreeRotation(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        static bool Numbers(JsonElement e, string name, out List<int> ids)
        {
            ids = [];
            if (!e.TryGetProperty(name, out var array) || array.ValueKind != JsonValueKind.Array) return false;
            if (array.EnumerateArray().Any(x => x.ValueKind != JsonValueKind.Number)) return false;
            ids = array.EnumerateArray().Select(x => x.GetInt32()).ToList();
            return true;
        }
        if (root.ValueKind == JsonValueKind.Object)
        {
            if (Numbers(root, "sr", out var sr) && Numbers(root, "newplayer", out _)) return sr;
            if (Numbers(root, "freeChampionIds", out var legacy) && Numbers(root, "freeChampionIdsForNewPlayers", out _)
                && root.TryGetProperty("maxNewPlayerLevel", out var level) && level.ValueKind == JsonValueKind.Number)
                return legacy;
        }
        throw new FormatException("Unknown champion rotation response");
    }

    public const string Cdragon = "https://raw.communitydragon.org";
    public const string GameData = "plugins/rcp-be-lol-game-data/global/default";
    private const string AssetPrefix = "/lol-game-data/assets/";
    // Mode variants (Swarm, TFT) live in the eight-digit id range
    private const int MaxSkinId = 10_000_000;

    /// <summary>16.20 from a CommunityDragon content version like 16.20.8248524+branch….</summary>
    public static string PatchOf(string version) => string.Join('.', version.Split('.').Take(2));

    /// <summary>The patch before; null for the first patch of a season, which has no comparable predecessor.</summary>
    public static string? PreviousPatch(string patch)
    {
        var parts = patch.Split('.');
        return parts.Length == 2 && int.TryParse(parts[1], out var minor) && minor > 1 ? $"{parts[0]}.{minor - 1}" : null;
    }

    /// <summary>A /lol-game-data/assets/… path as its raw CommunityDragon URL (paths are served lower-cased).</summary>
    public static string CdragonAsset(string path) => $"{Cdragon}/latest/{GameData}/{path.Replace(AssetPrefix, "").ToLowerInvariant()}";

    /// <summary>Skins in current that previous lacks: no base skins, no mode variants, ordered by id.</summary>
    public static List<NewSkin> NewSkinsBetween(IReadOnlyDictionary<string, RawSkin> current, IReadOnlyDictionary<string, RawSkin> previous) =>
        current.Values
            .Where(s => !s.IsBase && s.Id < MaxSkinId && !previous.ContainsKey(s.Id.ToString()) && s.Name is not null && s.Rarity is not null && s.SplashPath is not null)
            .OrderBy(s => s.Id)
            .Select(s => new NewSkin(s.Id, s.Name!, s.Rarity!, CdragonAsset(s.SplashPath!)))
            .ToList();

    /// <summary>kEpic to Epic; null for skins without a rarity.</summary>
    public static string? RarityLabel(string rarity)
    {
        var label = rarity.StartsWith('k') ? rarity[1..] : rarity;
        return label == "NoRarity" ? null : label;
    }

    /// <summary>Seven-day freshness of the stored list; a future timestamp counts as stale.</summary>
    public static CacheState SkinsCacheState(CachedSkins? cached, DateTime now)
    {
        if (cached is null) return CacheState.Missing;
        var age = now - cached.FetchedAt;
        return age >= TimeSpan.Zero && age < SkinsMaxAge ? CacheState.Fresh : CacheState.Stale;
    }

    /// <summary>Free-rotation champion ids as Data Dragon ids, sorted by display name; ids the map doesn't know yet are skipped.</summary>
    public static List<string> RotationChampions(IEnumerable<int> ids, Riot.DataDragonData dataDragon) =>
        ids.Select(id => dataDragon.ChampionIds.GetValueOrDefault(id))
            .OfType<string>()
            .OrderBy(dataDragon.ChampionName, StringComparer.InvariantCulture)
            .ToList();
}
