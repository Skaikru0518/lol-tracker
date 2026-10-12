import { prisma } from "@/lib/server/db";
import { NextRequest, NextResponse } from "next/server";
import {
	LP_RANGES,
	lpRangeStart,
	parseLpRange,
	RANGE_SNAPSHOT_LIMIT,
} from "@/lib/lp-history/range";
import { type LPSnapshot } from "@/lib/validators/lp-history";
import { withApiLog } from "@/lib/server/log";

const LEGACY_SNAPSHOT_LIMIT = 100;

async function getHandler(
	req: NextRequest,
): Promise<NextResponse<LPSnapshot[] | { error: string }>> {
	const puuid = req.nextUrl.searchParams.get("puuid");
	const queueType = req.nextUrl.searchParams.get("queueType") ?? "RANKED_SOLO_5x5";
	const range = parseLpRange(req.nextUrl.searchParams.get("range"));

	if (!puuid)
		return NextResponse.json({ error: "puuid is required" }, { status: 400 });
	if (!range)
		return NextResponse.json(
			{ error: `range must be one of: ${LP_RANGES.join(", ")}` },
			{ status: 400 },
		);

	try {
		const history = await prisma.lPHistory.findMany({
			where:
				range === "legacy"
					? { puuid, queueType }
					: { puuid, queueType, createdAt: { gte: lpRangeStart(range, new Date()) } },
			orderBy: { createdAt: "desc" },
			take: range === "legacy" ? LEGACY_SNAPSHOT_LIMIT : RANGE_SNAPSHOT_LIMIT,
		});

		return NextResponse.json(
			history.reverse().map((h) => ({
				id: h.id,
				tier: h.tier,
				rank: h.rank,
				lp: h.lp,
				wins: h.wins,
				losses: h.losses,
				createdAt: h.createdAt.toISOString(),
			})),
		);
	} catch {
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export const GET = withApiLog(getHandler);
