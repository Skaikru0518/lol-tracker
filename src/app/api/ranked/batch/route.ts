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

	// Batch DB lookup — single query for all puuids
	const allCached = await prisma.rankedEntry.findMany({
		where: { puuid: { in: puuids } },
	});

	// Group by puuid
	const cacheByPuuid = new Map<string, typeof allCached>();
	for (const entry of allCached) {
		const existing = cacheByPuuid.get(entry.puuid) ?? [];
		existing.push(entry);
		cacheByPuuid.set(entry.puuid, existing);
	}

	for (const puuid of puuids) {
		try {
			const cached = cacheByPuuid.get(puuid) ?? [];

			if (
				cached.length > 0 &&
				cached.every((entry) => isRecent(entry.updatedAt, 120))
			) {
				result[puuid] = cached;
				continue;
			}

			const entries = await getRankedByPuuid(puuid);

			// Ensure Account exists
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
		} catch {
			result[puuid] = [];
		}
	}

	return NextResponse.json(result);
}
