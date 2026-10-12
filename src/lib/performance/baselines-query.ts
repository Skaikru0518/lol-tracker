import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/db";
import { ACHIEVEMENT_QUEUE_IDS, MIN_ACHIEVEMENT_GAME_SECONDS } from "@/lib/achievements/eligibility";
import { QUANTILE_STEPS } from "./percentile";
import { METRIC_IDS, type MetricId } from "./weights";

export interface RoleQuantiles {
	role: string;
	games: number;
	metrics: Record<MetricId, number[] | null>;
}

// Metric ids are constants, so quoting them into the SQL is safe
const quantileColumns = Prisma.raw(
	METRIC_IDS.map((id) => `percentile_cont(ARRAY[${QUANTILE_STEPS.join(",")}]) WITHIN GROUP (ORDER BY "${id}") AS "${id}"`).join(",\n"),
);

export async function loadRoleQuantiles(since: Date): Promise<RoleQuantiles[]> {
	const rows = await prisma.$queryRaw<({ role: string; games: number } & Record<MetricId, number[] | null>)[]>`
		WITH p AS (
			SELECT
				m."matchId",
				m."gameDuration" / 60.0 AS mins,
				(x->>'teamId')::int AS team,
				x->>'teamPosition' AS role,
				(x->>'kills')::int AS kills,
				(x->>'deaths')::int AS deaths,
				(x->>'assists')::int AS assists,
				((x->>'totalMinionsKilled')::int + (x->>'neutralMinionsKilled')::int) AS cs,
				(x->>'goldEarned')::int AS gold,
				(x->>'champExperience')::int AS xp,
				(x->>'totalDamageDealtToChampions')::int AS dmg,
				(x->>'totalDamageTaken')::int AS taken,
				(x->>'damageDealtToObjectives')::int AS obj,
				((x->>'dragonKills')::int + (x->>'baronKills')::int) AS epic,
				((x->>'turretKills')::int + (x->>'inhibitorKills')::int) AS structures,
				(x->>'objectivesStolen')::int AS steals,
				(x->>'visionScore')::int AS vision,
				(x->>'wardsPlaced')::int AS wp,
				(x->>'wardsKilled')::int AS wk,
				(x->>'visionWardsBoughtInGame')::int AS cw
			FROM "Match" m
			CROSS JOIN LATERAL jsonb_array_elements(m.data->'info'->'participants') AS x
			WHERE m."queueId" = ANY(${ACHIEVEMENT_QUEUE_IDS}::int[])
				AND m."gameDuration" >= ${MIN_ACHIEVEMENT_GAME_SECONDS}
				AND m."gameCreation" >= ${BigInt(since.getTime())}
		),
		ranked AS (
			SELECT p.*, COUNT(*) OVER (PARTITION BY "matchId", team, role) AS same_role
			FROM p
		),
		team AS (
			SELECT "matchId", team, SUM(kills) AS tk, SUM(dmg) AS td, SUM(taken) AS tt
			FROM p GROUP BY 1, 2
		),
		metrics AS (
			SELECT
				r.role,
				(r.gold - o.gold) / r.mins AS "goldDiffPerMin",
				(r.xp - o.xp) / r.mins AS "xpDiffPerMin",
				(r.cs - o.cs) / r.mins AS "csDiffPerMin",
				(r.dmg - o.dmg) / r.mins AS "damageDiffPerMin",
				r.cs / r.mins AS "csPerMin",
				r.gold / r.mins AS "goldPerMin",
				(r.kills + r.assists)::float / GREATEST(r.deaths, 1) AS "kda",
				r.deaths / r.mins AS "deathsPerMin",
				CASE WHEN t.tk > 0 THEN (r.kills + r.assists)::float / t.tk ELSE 0 END AS "killParticipation",
				CASE WHEN t.td > 0 THEN r.dmg::float / t.td ELSE 0 END AS "damageShare",
				CASE WHEN t.tt > 0 THEN r.taken::float / t.tt ELSE 0 END AS "damageTakenShare",
				r.obj / r.mins AS "objectiveDamagePerMin",
				r.epic::float AS "epicKills",
				r.structures::float AS "structureKills",
				r.steals::float AS "steals",
				r.vision / r.mins AS "visionPerMin",
				r.wp / r.mins AS "wardsPlacedPerMin",
				r.wk / r.mins AS "wardsKilledPerMin",
				r.cw::float AS "controlWards"
			FROM ranked r
			JOIN team t ON t."matchId" = r."matchId" AND t.team = r.team
			LEFT JOIN ranked o ON o."matchId" = r."matchId" AND o.role = r.role AND o.team <> r.team AND o.same_role = 1 AND r.same_role = 1
			WHERE r.role IN ('TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY')
		)
		SELECT role, COUNT(*)::int AS games, ${quantileColumns}
		FROM metrics
		GROUP BY role
	`;
	return rows.map(({ role, games, ...metrics }) => ({ role, games, metrics: metrics as Record<MetricId, number[] | null> }));
}
