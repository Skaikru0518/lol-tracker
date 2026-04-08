import { getRankedByPuuid } from "@/lib/riot/ranked";
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

	const result: Record<string, unknown[]> = {};

	// Separate cached vs needs-fetch
	const needsFetch: string[] = [];

	for (const puuid of puuids) {
		const cached = cacheByPuuid.get(puuid) ?? [];
		if (
			cached.length > 0 &&
			cached.every((entry) => isRecent(entry.updatedAt, 120))
		) {
			result[puuid] = cached;
		} else {
			needsFetch.push(puuid);
		}
	}

	// Fetch missing in parallel (batches of 5 to respect rate limits)
	const BATCH_SIZE = 5;
	for (let i = 0; i < needsFetch.length; i += BATCH_SIZE) {
		const batch = needsFetch.slice(i, i + BATCH_SIZE);
		const results = await Promise.allSettled(
			batch.map(async (puuid) => {
				try {
					const entries = await getRankedByPuuid(puuid);

					// Ensure Account exists
					await prisma.account.upsert({
						where: { puuid },
						update: {},
						create: { puuid, gameName: "", tagLine: "" },
					});

					// Bulk upsert ranked entries
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
			}),
		);
	}

	// Ensure all puuids have an entry
	for (const puuid of puuids) {
		if (!result[puuid]) result[puuid] = [];
	}

	return NextResponse.json(result);
}
