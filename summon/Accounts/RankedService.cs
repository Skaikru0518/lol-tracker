using Microsoft.EntityFrameworkCore;
using summon.Data;
using summon.Riot;

namespace summon.Accounts
{
    public class RankedService(SummonDbContext db, RiotClient riot)
    {
        private static readonly TimeSpan MaxAge = TimeSpan.FromMinutes(2);
        private const int HistoryLimit = 100;

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

                // A snapshot only when the rank moved, so consecutive snapshots bracket the games that moved it
                var last = await db.LpSnapshots
                    .Where(s => s.Puuid == account.Puuid && s.QueueType == f.QueueType)
                    .OrderByDescending(s => s.CreatedAt)
                    .FirstOrDefaultAsync(ct);
                if (last is null || last.Tier != f.Tier || last.Rank != f.Rank || last.Lp != f.LeaguePoints)
                {
                    db.LpSnapshots.Add(new LpSnapshot
                    {
                        Puuid = account.Puuid,
                        QueueType = f.QueueType,
                        Tier = f.Tier,
                        Rank = f.Rank,
                        Lp = f.LeaguePoints,
                        Wins = f.Wins,
                        Losses = f.Losses,
                        CreatedAt = now,
                    });
                }
            }

            await db.SaveChangesAsync(ct);
            return stored;
        }

        /// <summary>The last 100 snapshots of each ranked queue, oldest first.</summary>
        public async Task<Dictionary<string, List<LpSnapshot>>> GetLpHistoryAsync(string puuid, CancellationToken ct = default)
        {
            var history = new Dictionary<string, List<LpSnapshot>>();
            foreach (var queueType in Ranks.QueueTypes)
            {
                var snapshots = await db.LpSnapshots.AsNoTracking()
                    .Where(s => s.Puuid == puuid && s.QueueType == queueType)
                    .OrderByDescending(s => s.CreatedAt)
                    .Take(HistoryLimit)
                    .ToListAsync(ct);
                snapshots.Reverse();
                history[queueType] = snapshots;
            }
            return history;
        }
    }
}
