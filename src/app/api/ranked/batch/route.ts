import { getRankedByPuuid } from "@/lib/riot/ranked";
import { RiotApiError } from "@/lib/riot/riot";
import { prisma } from "@/lib/db";
import { isRecent } from "@/lib/cache-utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const puuidsParam = req.nextUrl.searchParams.get("puuids");

	if (!puuidsParam)
		return NextResponse.json(
			{ error: "puuids is required" },
			{ status: 400 },
		);

	const puuids = puuidsParam.split(",").filter(Boolean);

	if (puuids.length === 0)
		return NextResponse.json(
			{ error: "puuids is required" },
			{ status: 400 },
		);

	const result: Record<string, unknown[]> = {};

	for (const puuid of puuids) {
		try {
			const cached = await prisma.rankedEntry.findMany({
				where: { puuid },
			});

			if (
				cached.length > 0 &&
				cached.every((entry) => isRecent(entry.updatedAt, 120))
			) {
				result[puuid] = cached;
				continue;
			}

			const entries = await getRankedByPuuid(puuid);

			// Ensure Account exists before upserting ranked entries
			await prisma.account.upsert({
				where: { puuid },
				update: {},
				create: { puuid, gameName: "", tagLine: "" },
			});

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
			}

			result[puuid] = entries;
		} catch (error) {
			// If Riot API returns 404 or other error, player has no rank
			result[puuid] = [];
		}
	}

	return NextResponse.json(result);
}
