import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { queueSelection, type QueueFilter } from "./queue";
import { type ChampionStatRow } from "./aggregate";

const MIN_GAME_DURATION_SECONDS = 300;

/** Per-champion totals for a player over stored matches, remakes excluded. */
export async function queryChampionStats(
	puuid: string,
	filter: QueueFilter,
): Promise<ChampionStatRow[]> {
	const { mode, ids } = queueSelection(filter);
	const queueClause =
		mode === "include"
			? Prisma.sql`AND m."queueId" = ANY(${ids}::int[])`
			: Prisma.sql`AND NOT (m."queueId" = ANY(${ids}::int[]))`;

	return prisma.$queryRaw<ChampionStatRow[]>`
		SELECT
			(p->>'championId')::int AS "championId",
			p->>'championName' AS "championName",
			COUNT(*)::int AS games,
			(COUNT(*) FILTER (WHERE (p->>'win')::boolean))::int AS wins,
			SUM((p->>'kills')::int)::int AS kills,
			SUM((p->>'deaths')::int)::int AS deaths,
			SUM((p->>'assists')::int)::int AS assists,
			SUM((p->>'totalMinionsKilled')::int + (p->>'neutralMinionsKilled')::int)::int AS cs,
			SUM((p->>'totalDamageDealtToChampions')::int)::int AS damage,
			SUM(m."gameDuration")::int AS "durationSeconds"
		FROM "Match" m
		CROSS JOIN LATERAL jsonb_array_elements(m.data->'info'->'participants') AS p
		WHERE m.data->'metadata'->'participants' @> ${JSON.stringify(puuid)}::jsonb
			AND p->>'puuid' = ${puuid}
			AND m."gameDuration" >= ${MIN_GAME_DURATION_SECONDS}
			${queueClause}
		GROUP BY 1, 2
		ORDER BY games DESC, wins DESC
	`;
}
