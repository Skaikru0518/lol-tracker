using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using summon.Data;

namespace summon.Achievements;

public record RunState(long At, long FullAt);
public record RunPlan(bool Full, DateTime? Since);

/// <summary>
/// The original's achievements cron: refreshes every account whose inputs changed since the last run (all of them on a
/// full run), then stores rarity.
/// </summary>
// shortcut: an in-process timer, so every running instance does its own runs; move it to one scheduled job when the app runs more than once
public class AchievementJob(IServiceScopeFactory scopes, ILogger<AchievementJob> logger) : BackgroundService
{
    private const string RunKey = "achievement-cron-run";
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);
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

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var timer = new PeriodicTimer(Interval);
        do
        {
            try
            {
                await RunAsync(ct);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                logger.LogError(e, "Achievement run failed");
            }
        } while (await timer.WaitForNextTickAsync(ct));
    }

    private async Task RunAsync(CancellationToken ct)
    {
        // Changes written while the run is going are picked up by the next run, so the window starts here
        var startedAt = DateTime.UtcNow;
        List<string> accounts;
        RunState? state;
        RunPlan plan;
        await using (var scope = scopes.CreateAsyncScope())
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
            await using var scope = scopes.CreateAsyncScope();
            try
            {
                awarded += await scope.ServiceProvider.GetRequiredService<AchievementService>().RefreshAsync(puuid, ct);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                logger.LogError(e, "Achievement refresh failed for {Puuid}", puuid);
            }
        }

        await using (var scope = scopes.CreateAsyncScope())
        {
            var achievements = scope.ServiceProvider.GetRequiredService<AchievementService>();
            await achievements.SaveRarityAsync(DateTime.UtcNow, ct);
            await achievements.SetSettingAsync(RunKey, JsonSerializer.Serialize(NextState(state, plan, startedAt), JsonSerializerOptions.Web), ct);
        }
        logger.LogInformation("Achievement run done: {Full} run, {Accounts} accounts, {Awarded} awarded, {Seconds}s",
            plan.Full ? "full" : "incremental", accounts.Count, awarded, (int)(DateTime.UtcNow - startedAt).TotalSeconds);
    }
}
