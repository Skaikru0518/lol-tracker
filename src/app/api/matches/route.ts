import { NextRequest, NextResponse } from "next/server";
import { getMatchIdsByPuuid, getMatchById } from "@/lib/riot/matches";
import { RiotApiError } from "@/lib/riot/riot";
import { prisma } from "@/lib/db";

/**
 * Match ids already stored for a player, newest first. Used as a fallback when
 * Riot cannot be reached — served by the same GIN index the achievement
 * detection uses.
 */
async function getCachedMatchIds(
	puuid: string,
	count: number,
): Promise<string[]> {
	const rows = await prisma.$queryRaw<{ matchId: string }[]>`
		SELECT "matchId" FROM "Match"
		WHERE data->'metadata'->'participants' @> ${JSON.stringify(puuid)}::jsonb
		ORDER BY "gameCreation" DESC
		LIMIT ${count}
	`;

	return rows.map((row) => row.matchId);
}

export async function GET(req: NextRequest) {
	const puuid = req.nextUrl.searchParams.get("puuid");
	const count = req.nextUrl.searchParams.get("count") ?? "20";
	const championId = req.nextUrl.searchParams.get("championId");

	if (!puuid)
		return NextResponse.json({ error: "puuid is required" }, { status: 400 });

	try {
		let matchIds: string[];
		let riotReachable = true;

		try {
			matchIds = await getMatchIdsByPuuid(
				puuid,
				parseInt(count),
				championId ? parseInt(championId) : undefined,
			);
		} catch (error) {
			if (!(error instanceof RiotApiError) || championId) throw error;

			matchIds = await getCachedMatchIds(puuid, parseInt(count));
			if (matchIds.length === 0) throw error;
			riotReachable = false;
		}

		// Batch DB lookup — single query instead of 50 individual ones
		const cachedMatches = await prisma.match.findMany({
			where: { matchId: { in: matchIds } },
		});
		const cachedMap = new Map(cachedMatches.map((m) => [m.matchId, m.data]));

		// Find which matches are missing from DB
		const missingIds = matchIds.filter((id) => !cachedMap.has(id));

		// Fetch missing matches from Riot API in parallel batches of 10
		const BATCH_SIZE = 10;
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
			.filter(Boolean);

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
