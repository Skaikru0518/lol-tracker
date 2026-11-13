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

            List<RiotLeagueEntry> fetched;
            try
            {
                fetched = await riot.GetLeagueEntriesAsync(account.Platform, account.Puuid, ct) ?? [];
            }
            catch (HttpRequestException)
            {
                // Riot down or rate limited: the stored entries are better than no ranked panels at all
                return stored;
            }

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

        /// <summary>
        /// Ranked entries for several players (a scoreboard), DB first with the same two-minute freshness; the rest come
        /// from Riot five at a time. Players we have never seen get a placeholder account row, like the original.
        /// </summary>
        public async Task<Dictionary<string, List<RankedEntry>>> GetBatchAsync(string platform, IReadOnlyCollection<string> puuids, CancellationToken ct = default)
        {
            var now = DateTime.UtcNow;
            var stored = (await db.RankedEntries.Where(e => puuids.Contains(e.Puuid)).ToListAsync(ct))
                .GroupBy(e => e.Puuid)
                .ToDictionary(g => g.Key, g => g.ToList());

            var result = new Dictionary<string, List<RankedEntry>>();
            var missing = new List<string>();
            foreach (var puuid in puuids)
            {
                if (stored.TryGetValue(puuid, out var entries) && entries.All(e => now - e.UpdatedAt < MaxAge)) result[puuid] = entries;
                else missing.Add(puuid);
            }

            // One query for which players already have an account row, instead of one lookup each
            var known = (await db.Accounts.Where(a => missing.Contains(a.Puuid)).Select(a => a.Puuid).ToListAsync(ct)).ToHashSet();

            foreach (var batch in missing.Chunk(5))
            {
                // Riot calls run in parallel; the DbContext is not thread safe, so the writes happen one by one afterwards
                var fetched = await Task.WhenAll(batch.Select(async puuid =>
                {
                    try
                    {
                        return (Puuid: puuid, Entries: await riot.GetLeagueEntriesAsync(platform, puuid, ct) ?? []);
                    }
                    catch (HttpRequestException)
                    {
                        return (Puuid: puuid, Entries: (List<RiotLeagueEntry>?)null);
                    }
                }));

                foreach (var (puuid, entries) in fetched)
                {
                    if (entries is null)
                    {
                        result[puuid] = stored.GetValueOrDefault(puuid) ?? [];
                        continue;
                    }

                    if (!known.Contains(puuid))
                        db.Accounts.Add(new Account { Puuid = puuid, GameName = "", TagLine = "", Platform = platform, UpdatedAt = now });

                    var rows = stored.GetValueOrDefault(puuid) ?? [];
                    foreach (var f in entries)
                    {
                        var entry = rows.Find(e => e.QueueType == f.QueueType);
                        if (entry is null)
                        {
                            entry = new RankedEntry { Puuid = puuid, QueueType = f.QueueType, Tier = f.Tier, Rank = f.Rank };
                            db.RankedEntries.Add(entry);
                            rows.Add(entry);
                        }
                        entry.Tier = f.Tier;
                        entry.Rank = f.Rank;
                        entry.LeaguePoints = f.LeaguePoints;
                        entry.Wins = f.Wins;
                        entry.Losses = f.Losses;
                        entry.UpdatedAt = now;
                    }
                    result[puuid] = rows;
                }
            }

            await db.SaveChangesAsync(ct);
            return result;
        }

        /// <summary>The last 100 snapshots of each ranked queue, oldest first.</summary>
        public async Task<Dictionary<string, List<LpSnapshot>>> GetLpHistoryAsync(string puuid, CancellationToken ct = default)
        {
            // The newest 100 of each queue, concatenated into one UNION ALL query instead of a round trip per queue
            var snapshots = await Ranks.QueueTypes
                .Select(queueType => db.LpSnapshots.AsNoTracking()
                    .Where(s => s.Puuid == puuid && s.QueueType == queueType)
                    .OrderByDescending(s => s.CreatedAt)
                    .Take(HistoryLimit))
                .Aggregate(Queryable.Concat)
                .ToListAsync(ct);

            return Ranks.QueueTypes.ToDictionary(
                queueType => queueType,
                queueType => snapshots.Where(s => s.QueueType == queueType).OrderBy(s => s.CreatedAt).ToList());
        }
    }
}
