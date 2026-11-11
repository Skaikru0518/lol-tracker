using Microsoft.EntityFrameworkCore;
using summon.Data;
using summon.Riot;

namespace summon.Accounts;

public class AccountService(SummonDbContext db, RiotClient riot)
{
    public async Task<Account?> ResolveAsync(string gameName, string tagLine, CancellationToken ct = default)
    {
        var stored = await db.Accounts.FirstOrDefaultAsync(a => a.GameName == gameName && a.TagLine == tagLine, ct);
        if (stored is not null) return stored;

        var fetched = await riot.GetAccountByRiotIdAsync(gameName, tagLine, ct);
        if (fetched is null) return null;

        var account = await db.Accounts.FindAsync([fetched.Puuid], ct);
        if (account is null)
        {
            account = new Account { Puuid = fetched.Puuid, GameName = fetched.GameName, TagLine = fetched.TagLine };
            db.Accounts.Add(account);
        }
        else
        {
            account.GameName = fetched.GameName;
            account.TagLine = fetched.TagLine;
        }

        account.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return account;
    }
}