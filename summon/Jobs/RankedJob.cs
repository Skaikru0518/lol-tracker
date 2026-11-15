using System.Net;
using Microsoft.EntityFrameworkCore;
using summon.Accounts;
using summon.Data;
using summon.Riot;

namespace summon.Jobs;

/// <summary>
/// The original's ranked cron (every 5 minutes): players whose LP moved in the last day are refreshed every run, the rest
/// take turns in batches of 40 from a stored cursor, so every stored account gets fresh ranks and LP snapshots.
/// </summary>
public class RankedJob(IServiceScopeFactory scopes, ILogger<RankedJob> logger, IConfiguration configuration) : ScheduledJob(scopes, logger)
{
    public const int Batch = 40;
    private const string CursorKey = "ranked-cron-cursor";
    private static readonly TimeSpan ActiveWindow = TimeSpan.FromDays(1);

    protected override string Name => "ranked";
    protected override TimeSpan Interval => TimeSpan.FromMinutes(5);
    protected override long LockKey => 7_303_100_002;

    /// <summary>The next <paramref name="size"/> ids after <paramref name="cursor"/>, wrapping around.</summary>
    public static List<string> NextBatch(IReadOnlyList<string> ids, string? cursor, int size)
    {
        var start = cursor is null ? 0 : ids.ToList().FindIndex(id => string.CompareOrdinal(id, cursor) > 0);
        var from = start == -1 ? 0 : start;
        return ids.Skip(from).Concat(ids.Take(from)).Take(size).ToList();
    }

    // Players with a recent LP change are likely mid-session, so they are refreshed every run to keep one snapshot per game
    public static (List<string> Active, List<string> Rotation) Plan(IReadOnlyList<string> ids, IReadOnlySet<string> activeIds, string? cursor, int size)
    {
        var active = ids.Where(activeIds.Contains).Take(size).ToList();
        var rest = ids.Where(id => !activeIds.Contains(id)).ToList();
        return (active, NextBatch(rest, cursor, size - active.Count));
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        // The Riot key is shared with the live site, so a local run can switch this job off (Jobs:Ranked = false)
        if (!configuration.GetValue("Jobs:Ranked", true)) return;
        await base.ExecuteAsync(ct);
    }

    protected override async Task RunAsync(CancellationToken ct)
    {
        List<(string Puuid, string? Platform)> accounts;
        HashSet<string> recent;
        string? cursor;
        await using (var scope = Scopes.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<SummonDbContext>();
            accounts = (await db.Accounts.Where(a => a.GameName != "").Select(a => new { a.Puuid, a.Platform }).ToListAsync(ct))
                .Select(a => (a.Puuid, a.Platform)).ToList();
            var since = DateTime.UtcNow - ActiveWindow;
            recent = (await db.LpSnapshots.Where(s => s.CreatedAt >= since).Select(s => s.Puuid).Distinct().ToListAsync(ct)).ToHashSet();
            cursor = await db.GetSettingAsync(CursorKey, ct);
        }

        // Ordinal order, so the cursor comparison matches the sort
        var ids = accounts.Select(a => a.Puuid).Order(StringComparer.Ordinal).ToList();
        var (active, rotation) = Plan(ids, recent, cursor, Batch);
        var inRotation = rotation.ToHashSet();
        var platformOf = accounts.ToDictionary(a => a.Puuid, a => Platforms.ByHost(a.Platform)?.Host ?? Platforms.ByKey(null).Host);

        var processed = 0;
        var snapshots = 0;
        string? lastDone = null;
        var rateLimited = false;
        foreach (var puuid in active.Concat(rotation))
        {
            await using var scope = Scopes.CreateAsyncScope();
            try
            {
                snapshots += await scope.ServiceProvider.GetRequiredService<RankedService>().RefreshAsync(puuid, platformOf[puuid], ct);
            }
            catch (HttpRequestException e) when (e.StatusCode == HttpStatusCode.TooManyRequests)
            {
                rateLimited = true;
                Logger.LogWarning("Ranked run rate limited after {Processed} accounts; resuming next run", processed);
                break;
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                if (e is not HttpRequestException { StatusCode: HttpStatusCode.NotFound }) Logger.LogError(e, "Ranked refresh failed for {Puuid}", puuid);
            }
            processed++;
            if (inRotation.Contains(puuid)) lastDone = puuid;
        }

        if (lastDone is not null)
        {
            await using var scope = Scopes.CreateAsyncScope();
            await scope.ServiceProvider.GetRequiredService<SummonDbContext>().SetSettingAsync(CursorKey, lastDone, ct);
        }
        Logger.LogInformation("Ranked run done: {Accounts} accounts, {Active} active, {Processed} processed, {Snapshots} snapshots, rate limited: {RateLimited}",
            accounts.Count, active.Count, processed, snapshots, rateLimited);
    }
}
