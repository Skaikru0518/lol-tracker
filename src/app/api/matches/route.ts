import { NextRequest, NextResponse } from "next/server";
import { getMatchIdsByPuuid, getMatchById } from "@/lib/riot/matches";
import { RiotApiError } from "@/lib/riot/riot";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
	const puuid = req.nextUrl.searchParams.get("puuid");
	const count = req.nextUrl.searchParams.get("count") ?? "20";
	const championId = req.nextUrl.searchParams.get("championId");

	if (!puuid)
		return NextResponse.json({ error: "puuid is required" }, { status: 400 });

	try {
		const matchIds = await getMatchIdsByPuuid(
			puuid,
			parseInt(count),
			championId ? parseInt(championId) : undefined,
		);

		// Batch DB lookup — single query instead of 50 individual ones
		const cachedMatches = await prisma.match.findMany({
			where: { matchId: { in: matchIds } },
		});
		const cachedMap = new Map(cachedMatches.map((m) => [m.matchId, m.data]));

		// Find which matches are missing from DB
		const missingIds = matchIds.filter((id) => !cachedMap.has(id));

		// Fetch missing matches from Riot API (sequential to avoid rate limits)
		for (const id of missingIds) {
			try {
				const matchData = await getMatchById(id);
				await prisma.match.create({
					data: {
						matchId: id,
						queueId: matchData.info.queueId,
						gameMode: matchData.info.gameMode,
						gameDuration: matchData.info.gameDuration,
						gameCreation: BigInt(matchData.info.gameCreation),
						data: matchData as any,
					},
				});
				cachedMap.set(id, matchData as any);
			} catch {
				// Skip individual match errors
			}
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
