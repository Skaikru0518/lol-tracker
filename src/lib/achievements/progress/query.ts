import { prisma } from "@/lib/server/db";
import { ACHIEVEMENT_QUEUE_IDS, MIN_ACHIEVEMENT_GAME_SECONDS } from "../eligibility";
import { type GameRow } from "./aggregate";
import { type CurrentRank, type MasteryPoint, type TierSnapshot } from "./types";

/** Every eligible game of the player as one narrow row; all-time and season sums are built from these in one scan. */
export async function loadGameRows(puuid: string): Promise<GameRow[]> {
	const rows = await prisma.$queryRaw<(Omit<GameRow, "gameCreation"> & { gameCreation: bigint })[]>`
		SELECT
			p->>'championName' AS "championName",
			m."gameCreation" AS "gameCreation",
			(p->>'win')::boolean AS win,
			(p->>'pentaKills')::int AS pentas,
			(p->>'quadraKills')::int AS quadras,
			(p->>'kills')::int AS kills,
			(p->>'assists')::int AS assists,
			(p->>'visionScore')::int AS vision,
			(p->>'turretKills')::int AS turrets,
			((p->>'dragonKills')::int + (p->>'baronKills')::int) AS epics
		FROM "Match" m
		CROSS JOIN LATERAL jsonb_array_elements(m.data->'info'->'participants') AS p
		WHERE m.data->'metadata'->'participants' @> ${JSON.stringify(puuid)}::jsonb
			AND p->>'puuid' = ${puuid}
			AND m."queueId" = ANY(${ACHIEVEMENT_QUEUE_IDS}::int[])
			AND m."gameDuration" >= ${MIN_ACHIEVEMENT_GAME_SECONDS}
	`;
	return rows.map((r) => ({ ...r, gameCreation: Number(r.gameCreation) }));
}

/** All LP snapshots of the player reduced to their tier, oldest first. */
export async function loadTierSnapshots(puuid: string): Promise<TierSnapshot[]> {
	return prisma.lPHistory.findMany({
		where: { puuid },
		select: { queueType: true, tier: true, createdAt: true },
		orderBy: { createdAt: "asc" },
	});
}

export async function loadCurrentRanks(puuid: string): Promise<(CurrentRank & { updatedAt: Date })[]> {
	return prisma.rankedEntry.findMany({ where: { puuid }, select: { queueType: true, tier: true, updatedAt: true } });
}

export async function loadMasteries(puuid: string): Promise<MasteryPoint[]> {
	return prisma.championMastery.findMany({ where: { puuid }, select: { championLevel: true, championPoints: true } });
}
