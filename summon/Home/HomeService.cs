using System.Collections.Concurrent;
using System.Net.Http.Json;
using System.Text.Json;
using summon.Data;
using summon.Riot;

namespace summon.Home;

/// <summary>The home page's free rotation and new skins, each cached in an AppSettings row and refreshed in the background once stale.</summary>
public class HomeService(SummonDbContext db, RiotClient riot, HttpClient http, IServiceScopeFactory scopes, ILogger<HomeService> logger)
{
    private const string RotationKey = "FREE_ROTATION";
    private const string SkinsKey = "NEW_SKINS";

    // One background refresh per row at a time, however many visitors see the stale copy
    private static readonly ConcurrentDictionary<string, byte> Refreshing = new();

    /// <summary>This week's free champion ids; the first call ever asks Riot and waits for it.</summary>
    public async Task<List<int>> RotationAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var cached = HomeFeeds.ParseCachedRotation(await db.GetSettingAsync(RotationKey, ct));
        switch (HomeFeeds.RotationCacheState(cached, now))
        {
            case CacheState.Missing:
                return await FetchRotationAsync(now, ct);
            case CacheState.Stale:
                RefreshInBackground(RotationKey, home => home.FetchRotationAsync(now, CancellationToken.None));
                break;
        }
        return cached!.FreeChampionIds;
    }

    private async Task<List<int>> FetchRotationAsync(DateTime now, CancellationToken ct)
    {
        var ids = HomeFeeds.ToFreeRotation(await riot.GetChampionRotationJsonAsync(Platforms.ByKey(Platforms.DefaultKey).Host, ct));
        await db.SetSettingAsync(RotationKey, HomeFeeds.SerializeRotation(ids, now), ct);
        return ids;
    }

    /// <summary>Skins added this patch; the first call ever downloads two ~6 MB skin lists from CommunityDragon and waits for them.</summary>
    public async Task<NewSkins> NewSkinsAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var cached = ParseCachedSkins(await db.GetSettingAsync(SkinsKey, ct));
        switch (HomeFeeds.SkinsCacheState(cached, now))
        {
            case CacheState.Missing:
                return await FetchSkinsAsync(now, ct);
            case CacheState.Stale:
                RefreshInBackground(SkinsKey, home => home.FetchSkinsAsync(now, CancellationToken.None));
                break;
        }
        return new NewSkins(cached!.Patch, cached.Skins);
    }

    private record ContentMetadata(string Version);

    private async Task<NewSkins> FetchSkinsAsync(DateTime now, CancellationToken ct)
    {
        var meta = await http.GetFromJsonAsync<ContentMetadata>($"{HomeFeeds.Cdragon}/latest/content-metadata.json", ct)
            ?? throw new FormatException("Empty CommunityDragon content metadata");
        var patch = HomeFeeds.PatchOf(meta.Version);
        var before = HomeFeeds.PreviousPatch(patch);
        var current = await SkinsAsync($"{HomeFeeds.Cdragon}/latest/{HomeFeeds.GameData}/v1/skins.json", ct);
        var previous = before is null ? current : await SkinsAsync($"{HomeFeeds.Cdragon}/{before}/{HomeFeeds.GameData}/v1/skins.json", ct);
        var result = new NewSkins(patch, HomeFeeds.NewSkinsBetween(current, previous));
        await db.SetSettingAsync(SkinsKey, JsonSerializer.Serialize(new CachedSkins(patch, now, result.Skins), JsonSerializerOptions.Web), ct);
        return result;
    }

    private async Task<Dictionary<string, RawSkin>> SkinsAsync(string url, CancellationToken ct) =>
        await http.GetFromJsonAsync<Dictionary<string, RawSkin>>(url, JsonSerializerOptions.Web, ct)
        ?? throw new FormatException($"Empty CommunityDragon skin list at {url}");

    private static CachedSkins? ParseCachedSkins(string? raw)
    {
        if (string.IsNullOrEmpty(raw)) return null;
        try
        {
            var cached = JsonSerializer.Deserialize<CachedSkins>(raw, JsonSerializerOptions.Web);
            return cached is { Patch: not null, Skins: not null } ? cached : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private void RefreshInBackground(string key, Func<HomeService, Task> refresh)
    {
        if (!Refreshing.TryAdd(key, 0)) return;
        _ = Task.Run(async () =>
        {
            try
            {
                // The request's scope ends with the page, so the refresh gets its own
                await using var scope = scopes.CreateAsyncScope();
                await refresh(scope.ServiceProvider.GetRequiredService<HomeService>());
            }
            catch (Exception e)
            {
                logger.LogError(e, "Background refresh of {Key} failed", key);
            }
            finally
            {
                Refreshing.TryRemove(key, out _);
            }
        });
    }
}
