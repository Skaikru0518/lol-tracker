import { getRankedByPuuid } from "@/lib/riot/ranked";
import { RiotApiError } from "@/lib/riot/riot";
import { prisma } from "@/lib/db";
import { isRecent } from "@/lib/cache-utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const puuid = req.nextUrl.searchParams.get("puuid");

	if (!puuid)
		return NextResponse.json(
			{ error: "puuid is required" },
			{ status: 400 },
		);

	try {
		const cached = await prisma.rankedEntry.findMany({ where: { puuid } });

		if (
			cached.length > 0 &&
			cached.every((entry) => isRecent(entry.updatedAt, 120))
		) {
			return NextResponse.json(cached);
		}

		const entries = await getRankedByPuuid(puuid);

		for (const entry of entries) {
			await prisma.rankedEntry.upsert({
				where: {
					puuid_queueType: { puuid, queueType: entry.queueType },
				},
				update: {
					tier: entry.tier,
					rank: entry.rank,
					leaguePoints: entry.leaguePoints,
					wins: entry.wins,
					losses: entry.losses,
					hotStreak: entry.hotStreak,
					veteran: entry.veteran,
					freshBlood: entry.freshBlood,
					inactive: entry.inactive,
				},
				create: {
					puuid,
					queueType: entry.queueType,
					tier: entry.tier,
					rank: entry.rank,
					leaguePoints: entry.leaguePoints,
					wins: entry.wins,
					losses: entry.losses,
					hotStreak: entry.hotStreak,
					veteran: entry.veteran,
					freshBlood: entry.freshBlood,
					inactive: entry.inactive,
				},
			});

			// LP snapshot — only if changed from last snapshot
			const lastSnapshot = await prisma.lPHistory.findFirst({
				where: { puuid, queueType: entry.queueType },
				orderBy: { createdAt: "desc" },
			});

			if (
				!lastSnapshot ||
				lastSnapshot.tier !== entry.tier ||
				lastSnapshot.rank !== entry.rank ||
				lastSnapshot.lp !== entry.leaguePoints
			) {
				await prisma.lPHistory.create({
					data: {
						puuid,
						queueType: entry.queueType,
						tier: entry.tier,
						rank: entry.rank,
						lp: entry.leaguePoints,
					},
				});
			}
		}

		return NextResponse.json(entries);
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
