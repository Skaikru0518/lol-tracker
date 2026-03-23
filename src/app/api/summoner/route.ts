import { RiotApiError } from "@/lib/riot/riot";
import { getSummonerByPuuid } from "@/lib/riot/summoner";
import { prisma } from "@/lib/db";
import { isRecent, revalidateInBackground } from "@/lib/cache-utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const puuid = req.nextUrl.searchParams.get("puuid");
	if (!puuid)
		return NextResponse.json({ error: "puuid is required" }, { status: 400 });

	try {
		const cached = await prisma.summoner.findUnique({ where: { puuid } });

		if (cached) {
			if (!isRecent(cached.updatedAt, 300)) {
				revalidateInBackground(async () => {
					const summoner = await getSummonerByPuuid(puuid);
					await prisma.summoner.upsert({
						where: { puuid },
						update: {
							profileIconId: summoner.profileIconId,
							summonerLevel: summoner.summonerLevel,
							revisionDate: BigInt(summoner.revisionDate),
						},
						create: {
							puuid,
							profileIconId: summoner.profileIconId,
							summonerLevel: summoner.summonerLevel,
							revisionDate: BigInt(summoner.revisionDate),
						},
					});
				});
			}

			return NextResponse.json({
				puuid: cached.puuid,
				profileIconId: cached.profileIconId,
				summonerLevel: cached.summonerLevel,
				revisionDate: Number(cached.revisionDate),
			});
		}

		// Not found in DB — first time, must await Riot API
		const summoner = await getSummonerByPuuid(puuid);

		await prisma.summoner.upsert({
			where: { puuid },
			update: {
				profileIconId: summoner.profileIconId,
				summonerLevel: summoner.summonerLevel,
				revisionDate: BigInt(summoner.revisionDate),
			},
			create: {
				puuid,
				profileIconId: summoner.profileIconId,
				summonerLevel: summoner.summonerLevel,
				revisionDate: BigInt(summoner.revisionDate),
			},
		});

		return NextResponse.json(summoner);
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
