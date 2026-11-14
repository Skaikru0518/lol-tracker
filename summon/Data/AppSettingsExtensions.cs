using Microsoft.EntityFrameworkCore;
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
