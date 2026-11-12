using Microsoft.EntityFrameworkCore;
using summon.Data;
using summon.Riot;

namespace summon.Accounts;

public class AccountService(SummonDbContext db, RiotClient riot)
{

    public async Task<Account?> AccountAsync(string gameName, string tagLine, CancellationToken ct = default)
    {
        var account = await db.Accounts.FirstOrDefaultAsync(a => a.GameName == gameName && a.TagLine == tagLine, ct) ?? await FetchAsync(gameName, tagLine, ct);
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

    public Task<RiotSummoner?> SummonerAsync(Account account, CancellationToken ct = default) =>
        account.Platform is null
        ? Task.FromResult<RiotSummoner?>(null)
        : riot.GetSummonerAsync(account.Platform, account.Puuid, ct);

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
