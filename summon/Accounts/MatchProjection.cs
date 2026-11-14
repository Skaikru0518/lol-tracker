using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using summon.Data;
using summon.Riot;

namespace summon.Accounts;

/// <summary>
/// Stored matches trimmed by Postgres before they leave the database, like the original's projectedMatchSql:
/// participants keep only the fields <see cref="RiotParticipant"/> reads, which is about half of each document.
/// </summary>
public static class MatchProjection
{
    // The JSON names of RiotParticipant's fields; Riot's keys are camelCase, so they match exactly
    private static readonly string[] Fields = typeof(RiotParticipant).GetConstructors()[0].GetParameters()
        .Select(p => JsonNamingPolicy.CamelCase.ConvertName(p.Name!))
        .ToArray();

    private static readonly int[] RankedQueues = [420, 440, 710];

    // Participant order is kept (WITH ORDINALITY); for matches listed in @ownOnly only the player's own participant is kept.
    // SqlQueryRaw runs the SQL through string.Format, so the JSON path's braces are doubled.
    private const string Column = """
        jsonb_set("Data", '{{info,participants}}', COALESCE((
            SELECT jsonb_agg((SELECT jsonb_object_agg(k, v) FROM jsonb_each(p) AS f(k, v) WHERE k = ANY(@fields)) ORDER BY i)
            FROM jsonb_array_elements("Data"->'info'->'participants') WITH ORDINALITY AS e(p, i)
            WHERE NOT ("MatchId" = ANY(@ownOnly)) OR p->>'puuid' = @puuid
        ), '[]'::jsonb))::text
        """;

    private sealed class Row
    {
        public string MatchId { get; set; } = "";
        public string Data { get; set; } = "";
    }

    /// <summary>Matches by id; for the ids in <paramref name="ownOnly"/> only <paramref name="puuid"/>'s participant is kept.</summary>
    public static Task<Dictionary<string, RiotMatch>> ByIdsAsync(SummonDbContext db, string[] ids, string puuid, string[] ownOnly, CancellationToken ct) =>
        LoadAsync(db, $"""SELECT "MatchId", {Column} AS "Data" FROM "Matches" WHERE "MatchId" = ANY(@ids)""",
            [new NpgsqlParameter("ids", ids), new NpgsqlParameter("puuid", puuid), new NpgsqlParameter("ownOnly", ownOnly)], ct);

    /// <summary>Every stored scorable ranked game since the given time, for the performance baselines.</summary>
    public static Task<Dictionary<string, RiotMatch>> RankedSinceAsync(SummonDbContext db, long sinceMs, CancellationToken ct) =>
        LoadAsync(db,
            $"""
            SELECT "MatchId", {Column} AS "Data" FROM "Matches"
            WHERE "QueueId" = ANY(@queues) AND "GameDuration" >= 300 AND "GameCreation" >= @since
            """,
            [new NpgsqlParameter("queues", RankedQueues), new NpgsqlParameter("since", sinceMs), new NpgsqlParameter("puuid", ""), new NpgsqlParameter("ownOnly", Array.Empty<string>())], ct);

    private static async Task<Dictionary<string, RiotMatch>> LoadAsync(SummonDbContext db, string sql, NpgsqlParameter[] parameters, CancellationToken ct)
    {
        var rows = await db.Database.SqlQueryRaw<Row>(sql, [.. parameters, new NpgsqlParameter("fields", Fields)]).ToListAsync(ct);
        return rows.ToDictionary(r => r.MatchId, r => JsonSerializer.Deserialize<RiotMatch>(r.Data, JsonSerializerOptions.Web)!);
    }
}
