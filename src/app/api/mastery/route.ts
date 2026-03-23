import { NextRequest, NextResponse } from "next/server";
import { getTopMasteries } from "@/lib/riot/mastery";
import { RiotApiError } from "@/lib/riot/riot";
import { prisma } from "@/lib/db";
import { isRecent, revalidateInBackground } from "@/lib/cache-utils";

export async function GET(req: NextRequest) {
	const puuid = req.nextUrl.searchParams.get("puuid");
	const count = req.nextUrl.searchParams.get("count") ?? "5";

	if (!puuid) {
		return NextResponse.json({ error: "puuid is required" }, { status: 400 });
	}

	try {
		const cached = await prisma.championMastery.findMany({
			where: { puuid },
			orderBy: { championPoints: "desc" },
			take: parseInt(count),
		});

		if (cached.length > 0) {
			// Always return DB data immediately (stale-while-revalidate)
			const stale = !cached.every((entry) => isRecent(entry.updatedAt, 1800));

			if (stale) {
				revalidateInBackground(async () => {
					const masteries = await getTopMasteries(puuid, parseInt(count));
					for (const mastery of masteries) {
						await prisma.championMastery.upsert({
							where: {
								puuid_championId: { puuid, championId: mastery.championId },
							},
							update: {
								championLevel: mastery.championLevel,
								championPoints: mastery.championPoints,
								lastPlayTime: BigInt(mastery.lastPlayTime),
							},
							create: {
								puuid,
								championId: mastery.championId,
								championLevel: mastery.championLevel,
								championPoints: mastery.championPoints,
								lastPlayTime: BigInt(mastery.lastPlayTime),
							},
						});
					}
				});
			}

			return NextResponse.json(
				cached.map((entry) => ({
					...entry,
					lastPlayTime: Number(entry.lastPlayTime),
				})),
			);
		}

		// Nothing in DB — must await Riot API before responding
		const masteries = await getTopMasteries(puuid, parseInt(count));

		for (const mastery of masteries) {
			await prisma.championMastery.upsert({
				where: {
					puuid_championId: { puuid, championId: mastery.championId },
				},
				update: {
					championLevel: mastery.championLevel,
					championPoints: mastery.championPoints,
					lastPlayTime: BigInt(mastery.lastPlayTime),
				},
				create: {
					puuid,
					championId: mastery.championId,
					championLevel: mastery.championLevel,
					championPoints: mastery.championPoints,
					lastPlayTime: BigInt(mastery.lastPlayTime),
				},
			});
		}

		return NextResponse.json(
			masteries.map((mastery) => ({
				...mastery,
				lastPlayTime: Number(mastery.lastPlayTime),
			})),
		);
	} catch (error) {
		if (error instanceof RiotApiError) {
			return NextResponse.json(
				{ error: error.message },
				{ status: error.status },
			);
		}
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
