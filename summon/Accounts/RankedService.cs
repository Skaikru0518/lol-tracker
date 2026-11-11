using Microsoft.EntityFrameworkCore;
using summon.Data;
using summon.Riot;

namespace summon.Accounts
{
    public class RankedService(SummonDbContext db, RiotClient riot)
    {
        private static readonly TimeSpan MaxAge = TimeSpan.FromMinutes(2);

        public async Task<List<RankedEntry>> GetAsync(Account account, CancellationToken ct = default)
        {
            var stored = await db.RankedEntries.Where(e => e.Puuid == account.Puuid).ToListAsync(ct);
            var now = DateTime.UtcNow;

            // shortcut: unranked players have no rows, so they are fetched on every view; add a checked-at time on Account if that costs too much
            if (account.Platform is null || (stored.Count > 0 && stored.All(e => now - e.UpdatedAt < MaxAge))) return stored;

            var fetched = await riot.GetLeagueEntriesAsync(account.Platform, account.Puuid, ct) ?? [];

            foreach(var f in fetched)
            {
                var entry = stored.Find(e => e.QueueType == f.QueueType);
                if(entry is null)
                {
                    entry = new RankedEntry { Puuid = account.Puuid, QueueType = f.QueueType, Tier = f.Tier, Rank = f.Rank};
                    db.RankedEntries.Add(entry);
                    stored.Add(entry);
                }

                entry.Tier = f.Tier;
                entry.Rank = f.Rank;
                entry.LeaguePoints = f.LeaguePoints;
                entry.Wins = f.Wins;
                entry.Losses = f.Losses;
                entry.UpdatedAt = now;
            }

            await db.SaveChangesAsync(ct);
            return stored;
        }
    }
}
