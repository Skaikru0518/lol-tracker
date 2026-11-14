using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
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
