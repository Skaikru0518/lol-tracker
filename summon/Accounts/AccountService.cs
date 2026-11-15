using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Net;
using Npgsql;
using summon.Data;
using summon.Riot;
using summon.Search;

namespace summon.Accounts;

public class AccountService(SummonDbContext db, RiotClient riot, IMemoryCache cache, IServiceScopeFactory scopes, ILogger<AccountService> logger)
{
    // A stored summoner is served as it is and refreshed in the background once older than this, like the original
    private static readonly TimeSpan SummonerMaxAge = TimeSpan.FromMinutes(5);
    private static readonly ConcurrentDictionary<string, byte> RefreshingSummoners = new();

    // The top mastery changes rarely, so a profile view and its refreshes reuse it for a while
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
        try
        {
            return await ResolveSummonerAsync(account.Platform, account.Puuid, account.Platform, ct);
        }
        catch (HttpRequestException)
        {
            // Without it the hero just has no icon and level; nothing is stored, so the next load tries again
            return null;
        }
    }

    /// <summary>The summoner on a server, or null when the account has none there; the stored row only counts on the account's stored server.</summary>
    private async Task<RiotSummoner?> ResolveSummonerAsync(string platform, string puuid, string? stored, CancellationToken ct)
    {
        var cached = stored == platform ? await db.Summoners.AsNoTracking().FirstOrDefaultAsync(s => s.Puuid == puuid, ct) : null;
        if (cached is null)
        {
            try
            {
                return await FetchAndStoreSummonerAsync(platform, puuid, ct);
            }
            catch (HttpRequestException e) when (e.StatusCode == HttpStatusCode.NotFound)
            {
                return null;
            }
        }
        if (DateTime.UtcNow - cached.UpdatedAt >= SummonerMaxAge) RefreshSummonerInBackground(platform, puuid);
        return new RiotSummoner(cached.ProfileIconId, cached.SummonerLevel);
    }

    private async Task<RiotSummoner?> FetchAndStoreSummonerAsync(string platform, string puuid, CancellationToken ct)
    {
        var summoner = await riot.GetSummonerAsync(platform, puuid, ct);
        if (summoner is null) return null;
        await db.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO "Summoners" ("Puuid", "ProfileIconId", "SummonerLevel", "UpdatedAt") VALUES (@puuid, @icon, @level, now())
            ON CONFLICT ("Puuid") DO UPDATE SET "ProfileIconId" = excluded."ProfileIconId", "SummonerLevel" = excluded."SummonerLevel", "UpdatedAt" = excluded."UpdatedAt"
            """,
            [new NpgsqlParameter("puuid", puuid), new NpgsqlParameter("icon", summoner.ProfileIconId), new NpgsqlParameter("level", summoner.SummonerLevel)], ct);
        return summoner;
    }

    private void RefreshSummonerInBackground(string platform, string puuid)
    {
        if (!RefreshingSummoners.TryAdd(puuid, 0)) return;
        _ = Task.Run(async () =>
        {
            try
            {
                // The request's scope ends with the page, so the refresh gets its own
                await using var scope = scopes.CreateAsyncScope();
                var accounts = scope.ServiceProvider.GetRequiredService<AccountService>();
                try
                {
                    await accounts.FetchAndStoreSummonerAsync(platform, puuid, CancellationToken.None);
                }
                catch (HttpRequestException e) when (e.StatusCode == HttpStatusCode.NotFound)
                {
                    // The account left this server; without the row the next load locates it again
                    await scope.ServiceProvider.GetRequiredService<SummonDbContext>().Summoners.Where(s => s.Puuid == puuid).ExecuteDeleteAsync();
                }
            }
            catch (Exception e)
            {
                logger.LogError(e, "Background summoner refresh failed for {Puuid}", puuid);
            }
            finally
            {
                RefreshingSummoners.TryRemove(puuid, out _);
            }
        });
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

    /// <summary>
    /// A Riot ID's account and the tracked server it plays on, trying the search picker's server (a host) first.
    /// Null when Riot knows no such Riot ID or it has no summoner on a tracked server.
    /// </summary>
    public async Task<(Account Account, string Platform)?> LocateAsync(string gameName, string tagLine, string? hint, CancellationToken ct = default)
    {
        Account? account;
        try
        {
            account = await db.Accounts.FirstOrDefaultAsync(a => a.GameName.ToLower() == gameName.ToLower() && a.TagLine.ToLower() == tagLine.ToLower(), ct)
                ?? await FetchAsync(gameName, tagLine, ct);
        }
        catch (HttpRequestException e) when (e.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
        if (account is null) return null;
        // A newly fetched account is saved first, since a found summoner is stored against it
        await db.SaveChangesAsync(ct);

        var stored = Platforms.ByHost(account.Platform)?.Host;
        var platform = await SearchQuery.LocatePlatformAsync(hint, stored,
            async host => await ResolveSummonerAsync(host, account.Puuid, stored, ct) is not null, () => ActiveRegionAsync(account.Puuid, ct));
        if (platform is not null && platform != account.Platform)
        {
            // One tracked server per account: moving it drops the old server's ranked and mastery rows
            if (account.Platform is not null)
            {
                await db.RankedEntries.Where(e => e.Puuid == account.Puuid).ExecuteDeleteAsync(ct);
                await db.ChampionMasteries.Where(m => m.Puuid == account.Puuid).ExecuteDeleteAsync(ct);
            }
            account.Platform = platform;
            account.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync(ct);
        return platform is null ? null : (account, platform);
    }

    private async Task<string?> ActiveRegionAsync(string puuid, CancellationToken ct)
    {
        try
        {
            return (await riot.GetActiveRegionAsync(puuid, ct))?.Region;
        }
        catch (HttpRequestException e) when (e.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    private const int SuggestionLimit = 8;
    private const int RecentLimit = 8;

    // Accounts a profile was opened for; those without a server are placeholders from lobby ranks
    private IQueryable<Account> Listed => db.Accounts.AsNoTracking().Where(a => a.GameName != "" && a.Platform != null);

    /// <summary>Stored summoners named exactly like the typed text first, then those whose name (and tag, if given) starts with it, with solo rank.</summary>
    public async Task<List<SearchSuggestion>> SuggestAsync(SearchTerms terms, CancellationToken ct = default)
    {
        var name = SearchQuery.LikeLiteral(terms.Name);
        var tag = terms.Tag is null ? null : SearchQuery.LikeLiteral(terms.Tag) + "%";
        // ILIKE in both queries, so the exact name is escaped too
        Task<List<SearchSuggestion>> Query(string pattern) => ToSuggestionsAsync(
            Listed.Where(a => EF.Functions.ILike(a.GameName, pattern) && (tag == null || EF.Functions.ILike(a.TagLine, tag)))
                .OrderByDescending(a => a.UpdatedAt).Take(SuggestionLimit), ct);

        // One after the other: a DbContext runs one query at a time
        var exact = await Query(name);
        var prefix = await Query(name + "%");
        return SearchQuery.MergeExactFirst(exact, prefix, r => r.Puuid, SuggestionLimit);
    }

    /// <summary>The summoners anyone looked up most recently, for the home page.</summary>
    public Task<List<SearchSuggestion>> RecentAsync(CancellationToken ct = default) =>
        ToSuggestionsAsync(Listed.OrderByDescending(a => a.UpdatedAt).Take(RecentLimit), ct);

    private async Task<List<SearchSuggestion>> ToSuggestionsAsync(IQueryable<Account> accounts, CancellationToken ct)
    {
        var rows = await accounts
            .Select(a => new
            {
                a.Puuid, a.GameName, a.TagLine, a.Platform,
                Icon = db.Summoners.Where(s => s.Puuid == a.Puuid).Select(s => (int?)s.ProfileIconId).FirstOrDefault(),
                Solo = a.RankedEntries.Where(e => e.QueueType == "RANKED_SOLO_5x5").Select(e => new { e.Tier, e.Rank, e.LeaguePoints }).FirstOrDefault(),
            })
            .ToListAsync(ct);
        return rows.Select(a => new SearchSuggestion(a.Puuid, a.GameName, a.TagLine, a.Platform!, a.Icon, a.Solo?.Tier, a.Solo?.Rank, a.Solo?.LeaguePoints)).ToList();
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
