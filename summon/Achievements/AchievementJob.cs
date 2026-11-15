using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using summon.Data;
using summon.Jobs;

namespace summon.Achievements;

public record RunState(long At, long FullAt);
public record RunPlan(bool Full, DateTime? Since);

/// <summary>
/// The original's achievements cron: refreshes every account whose inputs changed since the last run (all of them on a
/// full run), then stores rarity.
/// </summary>
public class AchievementJob(IServiceScopeFactory scopes, ILogger<AchievementJob> logger) : ScheduledJob(scopes, logger)
{
    private const string RunKey = "achievement-cron-run";
    protected override string Name => "achievements";
    protected override TimeSpan Interval => TimeSpan.FromHours(1);
    protected override long LockKey => 7_303_100_001;
    // Catches what the change query cannot see: new or changed achievement definitions
    private static readonly TimeSpan FullRunEvery = TimeSpan.FromDays(7);

    public static RunState? ParseRunState(string? raw)
    {
        if (raw is null) return null;
        try
        {
            return JsonSerializer.Deserialize<RunState>(raw, JsonSerializerOptions.Web);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    public static RunPlan Plan(RunState? state, DateTime now, bool force)
    {
        var nowMs = new DateTimeOffset(now).ToUnixTimeMilliseconds();
        var full = force || state is null || nowMs - state.FullAt >= FullRunEvery.TotalMilliseconds
            || Seasons.For(DateTimeOffset.FromUnixTimeMilliseconds(state.At).UtcDateTime)?.Id != Seasons.For(now)?.Id;
        return new RunPlan(full, full || state is null ? null : DateTimeOffset.FromUnixTimeMilliseconds(state.At).UtcDateTime);
    }

    public static RunState NextState(RunState? state, RunPlan plan, DateTime startedAt)
    {
        var at = new DateTimeOffset(startedAt).ToUnixTimeMilliseconds();
        return new RunState(at, plan.Full || state is null ? at : state.FullAt);
    }

    protected override async Task RunAsync(CancellationToken ct)
    {
        // Changes written while the run is going are picked up by the next run, so the window starts here
        var startedAt = DateTime.UtcNow;
        List<string> accounts;
        RunState? state;
        RunPlan plan;
        await using (var scope = Scopes.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<SummonDbContext>();
            var achievements = scope.ServiceProvider.GetRequiredService<AchievementService>();
            state = ParseRunState(await achievements.GetSettingAsync(RunKey, ct));
            plan = Plan(state, startedAt, force: false);
            var all = await db.Accounts.Where(a => a.GameName != "").Select(a => a.Puuid).ToListAsync(ct);
            var changed = plan.Since is { } since ? await achievements.ChangedPuuidsAsync(since, ct) : null;
            accounts = changed is null ? all : all.Where(changed.Contains).ToList();
        }

        var awarded = 0;
        foreach (var puuid in accounts)
        {
            // A scope per account keeps the change tracker small and one failure from stopping the run
            await using var scope = Scopes.CreateAsyncScope();
            try
            {
                awarded += await scope.ServiceProvider.GetRequiredService<AchievementService>().RefreshAsync(puuid, ct);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                Logger.LogError(e, "Achievement refresh failed for {Puuid}", puuid);
            }
        }

        await using (var scope = Scopes.CreateAsyncScope())
        {
            var achievements = scope.ServiceProvider.GetRequiredService<AchievementService>();
            await achievements.SaveRarityAsync(DateTime.UtcNow, ct);
            await achievements.SetSettingAsync(RunKey, JsonSerializer.Serialize(NextState(state, plan, startedAt), JsonSerializerOptions.Web), ct);
        }
        Logger.LogInformation("Achievement run done: {Full} run, {Accounts} accounts, {Awarded} awarded, {Seconds}s",
            plan.Full ? "full" : "incremental", accounts.Count, awarded, (int)(DateTime.UtcNow - startedAt).TotalSeconds);
    }
}
