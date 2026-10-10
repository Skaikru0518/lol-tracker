import { prisma } from "@/lib/server/db";
import { ACHIEVEMENT_QUEUE_IDS, MIN_ACHIEVEMENT_GAME_SECONDS } from "@/lib/achievements/eligibility";

/** Start time and result of the player's ranked games (Solo, Flex, 5s; remakes excluded) since `from`. */
export async function loadRankedResults(puuid: string, from: Date): Promise<{ gameCreation: number; win: boolean }[]> {
	const rows = await prisma.$queryRaw<{ gameCreation: bigint; win: boolean }[]>`
		SELECT m."gameCreation" AS "gameCreation", (p->>'win')::boolean AS win
		FROM "Match" m
		CROSS JOIN LATERAL jsonb_array_elements(m.data->'info'->'participants') AS p
		WHERE m.data->'metadata'->'participants' @> ${JSON.stringify(puuid)}::jsonb
			AND p->>'puuid' = ${puuid}
			AND m."queueId" = ANY(${ACHIEVEMENT_QUEUE_IDS}::int[])
			AND m."gameDuration" >= ${MIN_ACHIEVEMENT_GAME_SECONDS}
			AND m."gameCreation" >= ${BigInt(from.getTime())}
	`;
	return rows.map((r) => ({ gameCreation: Number(r.gameCreation), win: r.win }));
}
