using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using summon.Accounts;
using summon.Data;

namespace summon.Achievements;

public record FormRow(string AchievementId, DateTime EarnedAt);

/// <summary>Current form, milestone and seasonal rows plus rarity for one account.</summary>
public record AchievementPayload(List<FormRow> Form, List<AchievementProgress> Progress, Rarity? Rarity);

public class AchievementService(SummonDbContext db)
{
    private const string RarityKey = "achievement-rarity";
    private record RarityStore(DateTime ComputedAt, int Players, Dictionary<string, double[]> Shares);

    /// <summary>Peaks keep their highest value, so a later derank cannot make the card contradict the tier.</summary>
    private static readonly HashSet<string> PeakIds = Milestones.All.Concat(Seasonal.All).Where(d => d.Display == ProgressDisplay.Rank).Select(d => d.Id).ToHashSet();

    public async Task<AchievementPayload> LoadPayloadAsync(string puuid, CancellationToken ct = default)
    {
        var form = await db.PlayerAchievements.AsNoTracking().Where(a => a.Puuid == puuid).Select(a => new FormRow(a.AchievementId, a.EarnedAt)).ToListAsync(ct);
        var progress = await db.AchievementProgress.AsNoTracking().Where(p => p.Puuid == puuid).ToListAsync(ct);
        return new AchievementPayload(form, progress, await LoadRarityAsync(ct));
    }

    /// <summary>Awards the achievements one account earns now, removes the ones it lost, and recomputes its progress; returns how many were newly awarded.</summary>
    public async Task<int> RefreshAsync(string puuid, CancellationToken ct = default)
    {
        var earned = FormAchievements.Detect(await MatchProjection.RecentEligibleAsync(db, puuid, FormAchievements.MatchWindow, ct), puuid);
        var inserted = earned.Count == 0 ? 0 : await db.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO "PlayerAchievements" ("Puuid", "AchievementId", "EarnedAt")
            SELECT @puuid, id, now() FROM unnest(@ids) AS id
            ON CONFLICT DO NOTHING
            """,
            [new NpgsqlParameter("puuid", puuid), new NpgsqlParameter("ids", earned.ToArray())], ct);
        await db.PlayerAchievements.Where(a => a.Puuid == puuid && !earned.Contains(a.AchievementId)).ExecuteDeleteAsync(ct);
        await RecomputeProgressAsync(puuid, DateTime.UtcNow, ct);
        return inserted;
    }

    /// <summary>Recomputes milestones and seasons for one account and saves the merged rows.</summary>
    private async Task RecomputeProgressAsync(string puuid, DateTime now, CancellationToken ct)
    {
        var stored = await db.AchievementProgress.Where(p => p.Puuid == puuid).ToListAsync(ct);
        var games = await LoadGameRowsAsync(puuid, ct);
        var snapshots = await db.LpSnapshots.Where(s => s.Puuid == puuid).OrderBy(s => s.CreatedAt)
            .Select(s => new TierSnapshot(s.QueueType, s.Tier, s.CreatedAt)).ToListAsync(ct);
        var ranked = (await db.RankedEntries.Where(e => e.Puuid == puuid).Select(e => new { e.QueueType, e.Tier, e.UpdatedAt }).ToListAsync(ct))
            .Select(e => (new CurrentRank(e.QueueType, e.Tier), e.UpdatedAt)).ToList();
        var masteries = await db.ChampionMasteries.Where(m => m.Puuid == puuid).Select(m => new MasteryPoint(m.ChampionLevel, m.ChampionPoints)).ToListAsync(ct);

        var byKey = stored.ToDictionary(s => (s.AchievementId, s.Scope));
        var computed = Milestones.Evaluate(new MilestoneInputs(Aggregate.ChampionTotals(games), snapshots, ranked.Select(r => r.Item1).ToList(), masteries));

        foreach (var (season, closed) in Progress.SeasonsToCompute(stored.Select(s => s.Scope).ToHashSet(), now))
        {
            var range = Seasons.Range(season);
            var inputs = new SeasonalInputs(
                Aggregate.ChampionTotals(games, range),
                Aggregate.SeasonGames(games, range),
                snapshots.Where(s => range.Contains(s.CreatedAt)).ToList(),
                closed ? null : Aggregate.SeasonRanks(ranked, range.From));
            if (closed && !Progress.HasSeasonData(inputs)) continue;
            computed.AddRange(Seasonal.Evaluate(season.Id, inputs));
        }

        // Unchanged rows are skipped: an identical update still writes a new row version and WAL
        foreach (var result in computed)
        {
            var row = byKey.GetValueOrDefault((result.AchievementId, result.Scope));
            var merged = Progress.Merge(row, result, now, PeakIds.Contains(result.AchievementId));
            if (!Progress.Changed(row, merged)) continue;
            if (row is null)
            {
                row = new AchievementProgress { Puuid = puuid, AchievementId = result.AchievementId, Scope = result.Scope };
                db.AchievementProgress.Add(row);
            }
            row.Value = merged.Value;
            row.Tier = merged.Tier;
            row.ReachedAt = merged.ReachedAt;
            row.UpdatedAt = now;
        }
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Every eligible game of the player as one narrow row; all-time and season sums are built from these in one scan.</summary>
    private Task<List<GameRow>> LoadGameRowsAsync(string puuid, CancellationToken ct) =>
        db.Database.SqlQueryRaw<GameRow>(
            """
            SELECT
                p->>'championName' AS "ChampionName",
                m."GameCreation" AS "GameCreation",
                m."GameDuration" AS "GameDuration",
                p->>'teamPosition' AS "TeamPosition",
                (p->>'win')::boolean AS "Win",
                (p->>'pentaKills')::int AS "Pentas",
                (p->>'quadraKills')::int AS "Quadras",
                (p->>'kills')::int AS "Kills",
                (p->>'deaths')::int AS "Deaths",
                (p->>'assists')::int AS "Assists",
                (p->>'visionScore')::int AS "Vision",
                (p->>'turretKills')::int AS "Turrets",
                ((p->>'dragonKills')::int + (p->>'baronKills')::int) AS "Epics",
                (p->>'goldEarned')::int AS "Gold",
                ((p->>'totalMinionsKilled')::int + (p->>'neutralMinionsKilled')::int) AS "Cs",
                (p->>'totalDamageDealtToChampions')::int AS "Damage",
                (p->>'wardsPlaced')::int AS "WardsPlaced",
                (p->>'wardsKilled')::int AS "WardsKilled",
                ((p->>'totalHealsOnTeammates')::int + (p->>'totalDamageShieldedOnTeammates')::int) AS "Support",
                (p->>'firstBloodKill')::boolean AS "FirstBlood",
                (p->>'largestKillingSpree')::int AS "LargestSpree"
            FROM "MatchParticipants" mp
            JOIN "Matches" m ON m."MatchId" = mp."MatchId"
            CROSS JOIN LATERAL jsonb_array_elements(m."Data"->'info'->'participants') AS p
            WHERE mp."Puuid" = @puuid AND p->>'puuid' = @puuid
                AND m."QueueId" = ANY(@queues) AND m."GameDuration" >= @minSeconds
            """,
            new NpgsqlParameter("puuid", puuid), new NpgsqlParameter("queues", Eligibility.QueueIds), new NpgsqlParameter("minSeconds", Eligibility.MinGameSeconds))
            .ToListAsync(ct);

    /// <summary>Players whose achievement inputs may have changed since then: new games, LP snapshots, masteries or account rows.</summary>
    public async Task<HashSet<string>> ChangedPuuidsAsync(DateTime since, CancellationToken ct = default) =>
        (await db.Database.SqlQueryRaw<string>(
            """
            SELECT mp."Puuid" AS "Value" FROM "MatchParticipants" mp JOIN "Matches" m ON m."MatchId" = mp."MatchId" WHERE m."CreatedAt" > @since
            UNION SELECT "Puuid" FROM "LpSnapshots" WHERE "CreatedAt" > @since
            UNION SELECT "Puuid" FROM "ChampionMasteries" WHERE "UpdatedAt" > @since
            UNION SELECT "Puuid" FROM "Accounts" WHERE "UpdatedAt" > @since
            """,
            new NpgsqlParameter("since", since)).ToListAsync(ct)).ToHashSet();

    /// <summary>Counts every computed account (each has a Veteran row) and stores the shares for all-time and the current season.</summary>
    public async Task SaveRarityAsync(DateTime now, CancellationToken ct = default)
    {
        string[] scopes = [Scopes.AllTime, Seasons.Current(now).Id];
        var players = await db.AchievementProgress.CountAsync(p => p.AchievementId == "veteran" && p.Scope == Scopes.AllTime, ct);
        var groups = await db.AchievementProgress.Where(p => scopes.Contains(p.Scope))
            .GroupBy(p => new { p.AchievementId, p.Scope, p.Tier })
            .Select(g => new { g.Key.AchievementId, g.Key.Scope, g.Key.Tier, Count = g.Count() })
            .ToListAsync(ct);
        var shares = Progress.RarityShares(groups.Select(g => (g.AchievementId, g.Scope, g.Tier, g.Count)), players);
        await SetSettingAsync(RarityKey, JsonSerializer.Serialize(new RarityStore(now, players, shares), JsonSerializerOptions.Web), ct);
    }

    /// <summary>Stored rarity, or null before the first job run or when the stored JSON is unreadable.</summary>
    private async Task<Rarity?> LoadRarityAsync(CancellationToken ct)
    {
        var raw = await GetSettingAsync(RarityKey, ct);
        if (raw is null) return null;
        try
        {
            var store = JsonSerializer.Deserialize<RarityStore>(raw, JsonSerializerOptions.Web);
            return store is null ? null : new Rarity(store.Players, store.Shares);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    public Task<string?> GetSettingAsync(string key, CancellationToken ct = default) =>
        db.AppSettings.Where(s => s.Key == key).Select(s => s.Value).FirstOrDefaultAsync(ct);

    public Task SetSettingAsync(string key, string value, CancellationToken ct = default) =>
        db.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO "AppSettings" ("Key", "Value", "UpdatedAt") VALUES (@key, @value, now())
            ON CONFLICT ("Key") DO UPDATE SET "Value" = excluded."Value", "UpdatedAt" = excluded."UpdatedAt"
            """,
            [new NpgsqlParameter("key", key), new NpgsqlParameter("value", value)], ct);

    /// <summary>
    /// Badges of each match, per player. Stored ones are served as they are; eligible matches without any are
    /// detected now and saved. Other queues and remakes get an empty list.
    /// </summary>
    public async Task<Dictionary<string, List<BadgeAssignment>>> GetBadgesAsync(IEnumerable<string> matchIds, CancellationToken ct = default)
    {
        var result = matchIds.Distinct().ToDictionary(id => id, _ => new List<BadgeAssignment>());
        var ids = result.Keys.ToArray();
        if (ids.Length == 0) return result;

        // Only ranked games earn badges, so rows left from other queues are never served
        var eligibleIds = await db.Matches
            .Where(m => ids.Contains(m.MatchId) && Eligibility.QueueIds.Contains(m.QueueId) && m.GameDuration >= Eligibility.MinGameSeconds)
            .Select(m => m.MatchId).ToArrayAsync(ct);
        if (eligibleIds.Length == 0) return result;

        var existing = await db.MatchBadges.AsNoTracking().Where(b => eligibleIds.Contains(b.MatchId)).ToListAsync(ct);
        foreach (var badge in existing) result[badge.MatchId].Add(new BadgeAssignment(badge.Puuid, badge.BadgeId));

        var computed = existing.Select(b => b.MatchId).ToHashSet();
        var missing = eligibleIds.Where(id => !computed.Contains(id)).ToArray();
        if (missing.Length == 0) return result;

        var rows = new List<(string MatchId, BadgeAssignment Badge)>();
        foreach (var (id, match) in await MatchProjection.ByIdsAsync(db, missing, "", [], ct))
        {
            result[id] = MatchBadges.Detect(match.Info);
            rows.AddRange(result[id].Select(b => (id, b)));
        }
        if (rows.Count > 0)
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                INSERT INTO "MatchBadges" ("MatchId", "Puuid", "BadgeId")
                SELECT * FROM unnest(@matchIds, @puuids, @badgeIds)
                ON CONFLICT DO NOTHING
                """,
                [
                    new NpgsqlParameter("matchIds", rows.Select(r => r.MatchId).ToArray()),
                    new NpgsqlParameter("puuids", rows.Select(r => r.Badge.Puuid).ToArray()),
                    new NpgsqlParameter("badgeIds", rows.Select(r => r.Badge.BadgeId).ToArray()),
                ], ct);
        }
        return result;
    }
}
