using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace summon.Data;

/// <summary>Key-value rows for small server state: job runs, rarity, cached Riot and CommunityDragon lists.</summary>
public static class AppSettingsExtensions
{
    public static Task<string?> GetSettingAsync(this SummonDbContext db, string key, CancellationToken ct = default) =>
        db.AppSettings.Where(s => s.Key == key).Select(s => s.Value).FirstOrDefaultAsync(ct);

    public static Task SetSettingAsync(this SummonDbContext db, string key, string value, CancellationToken ct = default) =>
        db.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO "AppSettings" ("Key", "Value", "UpdatedAt") VALUES (@key, @value, now())
            ON CONFLICT ("Key") DO UPDATE SET "Value" = excluded."Value", "UpdatedAt" = excluded."UpdatedAt"
            """,
            [new NpgsqlParameter("key", key), new NpgsqlParameter("value", value)], ct);
}

/// <summary>The site-wide maintenance switch the original reads on every page.</summary>
public static class Maintenance
{
    public const string Key = "MAINTENANCE_MODE";

    /// <summary>On when the setting is "true"; a missing row or an unreadable database also counts as maintenance, like the original.</summary>
    public static async Task<bool> IsOnAsync(SummonDbContext db, ILogger logger, CancellationToken ct = default)
    {
        try
        {
            var value = await db.GetSettingAsync(Key, ct);
            return value is null || value == "true";
        }
        catch (Exception e)
        {
            logger.LogError(e, "Reading {Key} failed", Key);
            return true;
        }
    }
}
