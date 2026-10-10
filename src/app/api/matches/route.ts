import { NextRequest, NextResponse } from "next/server";
import { getMatchIdsByPuuid, getMatchById } from "@/lib/riot/matches";
import { RiotApiError } from "@/lib/riot/riot";
import { prisma } from "@/lib/db";
import { projectMatch } from "@/lib/match-projection";
import { parseChampionId, parseMatchCount } from "@/lib/match-query";
import { RIFT_QUEUE_IDS } from "@/lib/champion-stats/queue";

/**
 * Match ids already stored for a player, newest first. Used as a fallback when
 * Riot cannot be reached — served by the same GIN index the achievement
 * detection uses.
 */
async function getCachedMatchIds(
	puuid: string,
	count: number,
	start: number,
): Promise<string[]> {
	const rows = await prisma.$queryRaw<{ matchId: string }[]>`
		SELECT "matchId" FROM "Match"
		WHERE data->'metadata'->'participants' @> ${JSON.stringify(puuid)}::jsonb
		ORDER BY "gameCreation" DESC
		LIMIT ${count} OFFSET ${start}
	`;

	return rows.map((row) => row.matchId);
}

type StoredRow = { matchId: string; data: unknown };

/** Stored matches (with data) where the player played one champion, newest first; Riot's ids endpoint cannot filter by champion. */
async function getStoredChampionMatches(
	puuid: string,
	championId: number,
	count: number,
	start: number,
): Promise<StoredRow[]> {
	return prisma.$queryRaw<StoredRow[]>`
		SELECT m."matchId", m.data FROM "Match" m
		WHERE m.data->'metadata'->'participants' @> ${JSON.stringify(puuid)}::jsonb
			AND EXISTS (
				SELECT 1 FROM jsonb_array_elements(m.data->'info'->'participants') p
				WHERE p->>'puuid' = ${puuid} AND (p->>'championId')::int = ${championId}
			)
		ORDER BY m."gameCreation" DESC
		LIMIT ${count} OFFSET ${start}
	`;
}

/** Stored matches (with data) in the given queues, newest first. */
async function getStoredQueueMatches(puuid: string, queueIds: number[], count: number, start: number): Promise<StoredRow[]> {
	return prisma.$queryRaw<StoredRow[]>`
		SELECT "matchId", data FROM "Match"
		WHERE data->'metadata'->'participants' @> ${JSON.stringify(puuid)}::jsonb
			AND "queueId" = ANY(${queueIds}::int[])
		ORDER BY "gameCreation" DESC
		LIMIT ${count} OFFSET ${start}
	`;
}

export async function GET(req: NextRequest) {
	const puuid = req.nextUrl.searchParams.get("puuid");
	const count = parseMatchCount(req.nextUrl.searchParams.get("count"));
	const championId = parseChampionId(req.nextUrl.searchParams.get("championId"));
	const rift = req.nextUrl.searchParams.get("rift") === "true";
	const start = Math.max(Number.parseInt(req.nextUrl.searchParams.get("start") ?? "0", 10) || 0, 0);

	if (!puuid)
		return NextResponse.json({ error: "puuid is required" }, { status: 400 });
	if (championId === null)
		return NextResponse.json({ error: "championId must be a positive integer" }, { status: 400 });

	try {
		let matchIds: string[];
		let riotReachable = true;
		// Stored-only paths already carry the match data, so the batch lookup below is skipped for them
		let stored: StoredRow[] | null = null;

		if (championId) {
			stored = await getStoredChampionMatches(puuid, championId, count, start);
			matchIds = stored.map((row) => row.matchId);
		} else if (rift) {
			stored = await getStoredQueueMatches(puuid, RIFT_QUEUE_IDS, count, start);
			matchIds = stored.map((row) => row.matchId);
		} else {
			try {
				matchIds = await getMatchIdsByPuuid(puuid, count, start);
			} catch (error) {
				if (!(error instanceof RiotApiError)) throw error;

				matchIds = await getCachedMatchIds(puuid, count, start);
				if (matchIds.length === 0) throw error;
				riotReachable = false;
			}
		}

		// Batch DB lookup — single query instead of 50 individual ones
		const cachedMatches = stored ?? (await prisma.match.findMany({ where: { matchId: { in: matchIds } } }));
		const cachedMap = new Map(cachedMatches.map((m) => [m.matchId, m.data]));

		// Find which matches are missing from DB
		const missingIds = matchIds.filter((id) => !cachedMap.has(id));

		// Fetch missing matches from Riot API in parallel batches of 25
		const BATCH_SIZE = 25;
		for (let i = 0; riotReachable && i < missingIds.length; i += BATCH_SIZE) {
			const batch = missingIds.slice(i, i + BATCH_SIZE);
			await Promise.allSettled(
				batch.map(async (id) => {
					const matchData = await getMatchById(id);
					await prisma.match.upsert({
						where: { matchId: id },
						update: {},
						create: {
							matchId: id,
							queueId: matchData.info.queueId,
							gameMode: matchData.info.gameMode,
							gameDuration: matchData.info.gameDuration,
							gameCreation: BigInt(matchData.info.gameCreation),
							data: matchData as any,
						},
					});
					cachedMap.set(id, matchData as any);
				}),
			);
		}

		// Return matches in original order
		const matches = matchIds
			.map((id) => cachedMap.get(id))
			.filter(Boolean)
			.map(projectMatch);

		return NextResponse.json(matches);
	} catch (error) {
		if (error instanceof RiotApiError)
			return NextResponse.json(
				{ error: error.message },
				{ status: error.status },
			);

		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
