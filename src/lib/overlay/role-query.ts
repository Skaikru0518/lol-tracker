import { prisma } from "@/lib/server/db";

const RIFT_QUEUES = [400, 420, 430, 440, 490];
const RECENT_MATCHES = 20;

export async function storedPositionCounts(puuid: string): Promise<{ position: string; games: number }[]> {
	return prisma.$queryRaw<{ position: string; games: number }[]>`
		SELECT p->>'teamPosition' AS position, count(*)::int AS games
		FROM (
			SELECT data FROM "Match"
			WHERE data->'metadata'->'participants' @> ${JSON.stringify(puuid)}::jsonb
				AND "queueId" = ANY(${RIFT_QUEUES}::int[])
			ORDER BY "gameCreation" DESC
			LIMIT ${RECENT_MATCHES}
		) m, jsonb_array_elements(m.data->'info'->'participants') p
		WHERE p->>'puuid' = ${puuid}
		GROUP BY 1
	`;
}
