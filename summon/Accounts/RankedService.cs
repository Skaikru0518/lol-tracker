using Microsoft.EntityFrameworkCore;
using summon.Data;
using summon.Riot;

namespace summon.Accounts
{
    public class RankedService(SummonDbContext db, RiotClient riot)
    {
        private static readonly TimeSpan MaxAge = TimeSpan.FromMinutes(2);
        private const int HistoryLimit = 100;
        private const int RangeLimit = 2000;

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

            Save(account.Puuid, stored, fetched, await LatestSnapshotsAsync([account.Puuid], ct), now);
            await db.SaveChangesAsync(ct);
            return stored;
        }

        /// <summary>
        /// Ranked entries for several players (a scoreboard), DB first with the same two-minute freshness; the rest come
        /// from Riot five at a time and are saved like a profile's own, LP snapshots included. Players we have never seen
        /// get a placeholder account row, and stale entries are served when Riot fails, like the original.
        /// </summary>
        public async Task<Dictionary<string, List<RankedEntry>>> GetBatchAsync(string platform, IReadOnlyCollection<string> puuids, CancellationToken ct = default)
        {
            var now = DateTime.UtcNow;
            var stored = (await db.RankedEntries.Where(e => puuids.Contains(e.Puuid)).ToListAsync(ct))
                .GroupBy(e => e.Puuid)
                .ToDictionary(g => g.Key, g => g.ToList());

            var result = puuids.ToDictionary(puuid => puuid, puuid => stored.GetValueOrDefault(puuid) ?? []);
            var missing = puuids.Where(puuid => !stored.TryGetValue(puuid, out var entries) || entries.Any(e => now - e.UpdatedAt >= MaxAge)).ToList();
            if (missing.Count == 0) return result;

            var fetched = new List<(string Puuid, List<RiotLeagueEntry> Entries)>();
            foreach (var batch in missing.Chunk(5))
            {
                // Riot calls run in parallel; the DbContext is not thread safe, so the writes happen one by one afterwards
                var results = await Task.WhenAll(batch.Select(async puuid =>
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
                fetched.AddRange(results.Where(r => r.Entries is not null).Select(r => (r.Puuid, r.Entries!)));
            }
            if (fetched.Count == 0) return result;

            // One query each for known accounts and latest snapshots, instead of one lookup per player
            var fetchedPuuids = fetched.Select(f => f.Puuid).ToList();
            var known = (await db.Accounts.Where(a => fetchedPuuids.Contains(a.Puuid)).Select(a => a.Puuid).ToListAsync(ct)).ToHashSet();
            var latest = await LatestSnapshotsAsync(fetchedPuuids, ct);

            foreach (var (puuid, entries) in fetched)
            {
                if (!known.Contains(puuid))
                    db.Accounts.Add(new Account { Puuid = puuid, GameName = "", TagLine = "", Platform = platform, UpdatedAt = now });
                Save(puuid, result[puuid], entries, latest, now);
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

        /// <summary>One queue's snapshots in a range ("7d", "30d" or "season"), oldest first; at most the newest 2000, like the original.</summary>
        public async Task<List<LpSnapshot>> GetLpRangeAsync(string puuid, string queueType, string range, CancellationToken ct = default)
        {
            var since = LpHistory.RangeStart(range, DateTime.UtcNow);
            var snapshots = await db.LpSnapshots.AsNoTracking()
                .Where(s => s.Puuid == puuid && s.QueueType == queueType && s.CreatedAt >= since)
                .OrderByDescending(s => s.CreatedAt)
                .Take(RangeLimit)
                .ToListAsync(ct);
            snapshots.Reverse();
            return snapshots;
        }

        /// <summary>The newest snapshot of each (player, queue), in one query.</summary>
        private async Task<Dictionary<(string Puuid, string QueueType), LpSnapshot>> LatestSnapshotsAsync(IReadOnlyCollection<string> puuids, CancellationToken ct) =>
            (await db.LpSnapshots.AsNoTracking()
                .Where(s => puuids.Contains(s.Puuid))
                .GroupBy(s => new { s.Puuid, s.QueueType })
                .Select(g => g.OrderByDescending(s => s.CreatedAt).First())
                .ToListAsync(ct))
            .ToDictionary(s => (s.Puuid, s.QueueType));

        /// <summary>Upserts a player's entries into <paramref name="rows"/> and records an LP snapshot for each queue whose rank moved.</summary>
        private void Save(string puuid, List<RankedEntry> rows, IEnumerable<RiotLeagueEntry> fetched,
            IReadOnlyDictionary<(string Puuid, string QueueType), LpSnapshot> latest, DateTime now)
        {
            foreach (var f in fetched)
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

                // A snapshot only when the rank moved, so consecutive snapshots bracket the games that moved it
                var last = latest.GetValueOrDefault((puuid, f.QueueType));
                if (last is null || last.Tier != f.Tier || last.Rank != f.Rank || last.Lp != f.LeaguePoints)
                {
                    db.LpSnapshots.Add(new LpSnapshot
                    {
                        Puuid = puuid,
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
        }
    }
}
