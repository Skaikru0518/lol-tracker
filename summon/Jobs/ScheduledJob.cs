using Microsoft.EntityFrameworkCore;
using summon.Data;

namespace summon.Jobs;

/// <summary>
/// One of the original's crons as a timer: every running instance has it, and a Postgres advisory lock plus the stored
/// time of the last run make one of them do each run.
/// </summary>
public abstract class ScheduledJob(IServiceScopeFactory scopes, ILogger logger) : BackgroundService
{
    protected abstract string Name { get; }
    protected abstract TimeSpan Interval { get; }
    protected abstract long LockKey { get; }
    protected IServiceScopeFactory Scopes => scopes;
    protected ILogger Logger => logger;

    private string RunKey => $"job-run:{Name}";
    // Instances start at different times; a run newer than this means another instance already did this one
    private TimeSpan RecentRun => Interval * 0.9;

    protected abstract Task RunAsync(CancellationToken ct);

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var timer = new PeriodicTimer(Interval);
        do
        {
            try
            {
                await RunLockedAsync(ct);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                logger.LogError(e, "{Job} run failed", Name);
            }
        } while (await timer.WaitForNextTickAsync(ct));
    }

    /// <summary>Runs unless another instance holds the lock or just ran it; the lock lives on this connection until the run ends.</summary>
    private async Task RunLockedAsync(CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<SummonDbContext>();
        await db.Database.OpenConnectionAsync(ct);
        try
        {
            if (!await db.Database.SqlQueryRaw<bool>("""SELECT pg_try_advisory_lock({0}) AS "Value" """, LockKey).SingleAsync(ct))
            {
                logger.LogInformation("{Job} run skipped: another instance is running it", Name);
                return;
            }
            try
            {
                var startedAt = DateTimeOffset.UtcNow;
                if (DateTimeOffset.TryParse(await db.GetSettingAsync(RunKey, ct), out var last) && startedAt - last < RecentRun)
                {
                    logger.LogInformation("{Job} run skipped: another instance ran it at {Last:u}", Name, last);
                    return;
                }
                await RunAsync(ct);
                // A failed run stores nothing, so the next tick on any instance tries again
                await db.SetSettingAsync(RunKey, startedAt.ToString("O"), ct);
            }
            finally
            {
                await db.Database.SqlQueryRaw<bool>("""SELECT pg_advisory_unlock({0}) AS "Value" """, LockKey).SingleAsync(CancellationToken.None);
            }
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }
    }
}
