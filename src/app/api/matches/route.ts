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
		const matches = [];
		for (const id of matchIds) {
			const cached = await prisma.match.findUnique({ where: { matchId: id } });
			if (cached) {
				matches.push(cached.data);
			} else {
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
				matches.push(matchData);
			}
		}
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
