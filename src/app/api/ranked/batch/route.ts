import { DEFAULT_PLATFORM, isPlatform } from "@/lib/game/platforms";
import { getRankedByPuuid } from "@/lib/riot/ranked";
import { prisma } from "@/lib/server/db";
import { isRecent } from "@/lib/server/cache-utils";
import { rateLimited } from "@/lib/server/ip-rate-limit";
import { saveRankedEntries } from "@/lib/summoner/profile/ranked";
import { NextRequest, NextResponse } from "next/server";
import { withApiLog } from "@/lib/server/log";

// One game's lobby: 10 players, 16 in Arena
const MAX_PUUIDS = 16;
const BATCH_SIZE = 5;

async function getHandler(req: NextRequest) {
	if (rateLimited(req, "ranked-batch")) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const platformParam = req.nextUrl.searchParams.get("platform");
	const platform = isPlatform(platformParam) ? platformParam : DEFAULT_PLATFORM;
	const puuids = [...new Set((req.nextUrl.searchParams.get("puuids") ?? "").split(",").filter(Boolean))];
	if (puuids.length === 0) return NextResponse.json({ error: "puuids is required" }, { status: 400 });
	if (puuids.length > MAX_PUUIDS) return NextResponse.json({ error: `at most ${MAX_PUUIDS} puuids` }, { status: 400 });

	const allCached = await prisma.rankedEntry.findMany({ where: { puuid: { in: puuids } } });
	// Stale rows are still served when the refresh below fails (e.g. Riot rate limit)
	const result: Record<string, unknown[]> = Object.fromEntries(puuids.map((p) => [p, allCached.filter((e) => e.puuid === p)]));
	const needsFetch = puuids.filter((p) => result[p].length === 0 || !allCached.every((e) => e.puuid !== p || isRecent(e.updatedAt, 120)));

	for (let i = 0; i < needsFetch.length; i += BATCH_SIZE) {
		await Promise.allSettled(
			needsFetch.slice(i, i + BATCH_SIZE).map(async (puuid) => {
				const entries = await getRankedByPuuid(platform, puuid);
				await prisma.account.upsert({ where: { puuid }, update: {}, create: { puuid, gameName: "", tagLine: "", platform } });
				await saveRankedEntries(puuid, entries);
				result[puuid] = entries;
			}),
		);
	}

	return NextResponse.json(result);
}

export const GET = withApiLog(getHandler);
