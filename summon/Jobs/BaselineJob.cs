using summon.Scoring;

namespace summon.Jobs;

/// <summary>The original's daily performance-baselines cron.</summary>
public class BaselineJob(IServiceScopeFactory scopes, ILogger<BaselineJob> logger) : ScheduledJob(scopes, logger)
{
    protected override string Name => "performance-baselines";
    protected override TimeSpan Interval => TimeSpan.FromDays(1);
    protected override long LockKey => 7_303_100_003;

    protected override async Task RunAsync(CancellationToken ct)
    {
        await using var scope = Scopes.CreateAsyncScope();
        var sampleSize = await scope.ServiceProvider.GetRequiredService<PerformanceService>().ComputeAndSaveBaselinesAsync(ct);
        Logger.LogInformation("Performance baselines stored: {SampleSize} games", sampleSize);
    }
}
