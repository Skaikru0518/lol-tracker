using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Npgsql;
using summon.Data;
using summon.Riot;

namespace summon.Accounts;

public class AccountService(SummonDbContext db, RiotClient riot, IMemoryCache cache)
{
    // Icon, level and top mastery change rarely, so a profile view and its refreshes reuse them for a while
    private static readonly TimeSpan ProfileCacheTime = TimeSpan.FromMinutes(10);

    public async Task<Account?> AccountAsync(string gameName, string tagLine, CancellationToken ct = default)
    {
        // Riot IDs are case-insensitive; an exact match missed every differently cased URL and went to Riot each time
        var account = await db.Accounts.FirstOrDefaultAsync(a => a.GameName.ToLower() == gameName.ToLower() && a.TagLine.ToLower() == tagLine.ToLower(), ct)
            ?? await FetchAsync(gameName, tagLine, ct);
        if (account is null) return null;

        if(account.Platform is null)
        {
            var region = await riot.GetActiveRegionAsync(account.Puuid, ct);
            account.Platform = region?.Region;
            account.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return account;
    }

    public async Task<RiotSummoner?> SummonerAsync(Account account, CancellationToken ct = default)
    {
        if (account.Platform is null) return null;
        if (cache.TryGetValue($"summoner:{account.Puuid}", out RiotSummoner? cached)) return cached;

        try
        {
            var summoner = await riot.GetSummonerAsync(account.Platform, account.Puuid, ct);
            cache.Set($"summoner:{account.Puuid}", summoner, ProfileCacheTime);
            return summoner;
        }
        catch (HttpRequestException)
        {
            // Without it the hero just has no icon and level; nothing is cached, so the next load tries again
            return null;
        }
    }

    public async Task<int?> TopChampionIdAsync(Account account, CancellationToken ct = default)
    {
        if (account.Platform is null) return null;
        if (cache.TryGetValue($"top-champion:{account.Puuid}", out int? cached)) return cached;

        try
        {
            var masteries = await riot.GetTopMasteriesAsync(account.Platform, account.Puuid, 1, ct);
            var championId = masteries?.FirstOrDefault()?.ChampionId;
            cache.Set($"top-champion:{account.Puuid}", championId, ProfileCacheTime);
            return championId;
        }
        catch (HttpRequestException)
        {
            // The splash is decoration, so a failed mastery call leaves the hero without one, like the original
            return null;
        }
    }

    /// <summary>Every champion's mastery, most points first; empty when Riot cannot be reached.</summary>
    // shortcut: kept in memory for 30 minutes instead of the original's mastery table; store it once other pages need it without Riot
    public async Task<List<RiotMastery>> AllMasteriesAsync(Account account, CancellationToken ct = default)
    {
        if (account.Platform is null) return [];
        if (cache.TryGetValue($"masteries:{account.Puuid}", out List<RiotMastery>? cached)) return cached!;

        try
        {
            var masteries = (await riot.GetAllMasteriesAsync(account.Platform, account.Puuid, ct) ?? []).OrderByDescending(m => m.ChampionPoints).ToList();
            await SaveMasteriesAsync(account.Puuid, masteries, ct);
            cache.Set($"masteries:{account.Puuid}", masteries, TimeSpan.FromMinutes(30));
            return masteries;
        }
        catch (HttpRequestException)
        {
            return [];
        }
    }

    // One upsert statement, so two loads of the same profile at once cannot collide on the key
    private Task SaveMasteriesAsync(string puuid, List<RiotMastery> masteries, CancellationToken ct) =>
        masteries.Count == 0 ? Task.CompletedTask : db.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO "ChampionMasteries" ("Puuid", "ChampionId", "ChampionLevel", "ChampionPoints", "UpdatedAt")
            SELECT @puuid, u.id, u.level, u.points, now() FROM unnest(@ids, @levels, @points) AS u(id, level, points)
            ON CONFLICT ("Puuid", "ChampionId") DO UPDATE
            SET "ChampionLevel" = excluded."ChampionLevel", "ChampionPoints" = excluded."ChampionPoints", "UpdatedAt" = excluded."UpdatedAt"
            """,
            [
                new NpgsqlParameter("puuid", puuid),
                new NpgsqlParameter("ids", masteries.Select(m => m.ChampionId).ToArray()),
                new NpgsqlParameter("levels", masteries.Select(m => m.ChampionLevel).ToArray()),
                new NpgsqlParameter("points", masteries.Select(m => m.ChampionPoints).ToArray()),
            ], ct);

    private async Task<Account?> FetchAsync(string gameName, string tagLine, CancellationToken ct)
    {
        var fetched = await riot.GetAccountByRiotIdAsync(gameName, tagLine, ct);
        if (fetched is null) return null;

        var account = await db.Accounts.FindAsync([fetched.Puuid], ct);
        if(account is null)
        {
            account = new Account { Puuid = fetched.Puuid, GameName = fetched.GameName, TagLine = fetched.TagLine};
            db.Accounts.Add(account);
        }
        else
        {
            account.GameName = fetched.GameName;
            account.TagLine = fetched.TagLine;
        }

        account.UpdatedAt = DateTime.UtcNow;
        return account;
    }

}
