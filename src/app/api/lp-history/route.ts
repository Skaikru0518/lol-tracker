import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const puuid = req.nextUrl.searchParams.get("puuid");
	const queueType = req.nextUrl.searchParams.get("queueType") ?? "RANKED_SOLO_5x5";

	if (!puuid)
		return NextResponse.json(
			{ error: "puuid is required" },
			{ status: 400 },
		);

	try {
		const history = await prisma.lPHistory.findMany({
			where: { puuid, queueType },
			orderBy: { createdAt: "asc" },
			take: 100,
		});

		return NextResponse.json(
			history.map((h) => ({
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
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
