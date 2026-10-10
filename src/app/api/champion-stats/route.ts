import { NextRequest, NextResponse } from "next/server";
import { parseQueueFilter, QUEUE_FILTERS } from "@/lib/game/queue-filters";
import { queryChampionStats } from "@/lib/summoner/champions/stats-query";
import { toChampionStat } from "@/lib/summoner/champions/stats-aggregate";
import { type ChampionStat } from "@/lib/validators/champion-stats";

export async function GET(
	req: NextRequest,
): Promise<NextResponse<ChampionStat[] | { error: string }>> {
	const puuid = req.nextUrl.searchParams.get("puuid");
	const queue = parseQueueFilter(req.nextUrl.searchParams.get("queue"));

	if (!puuid)
		return NextResponse.json({ error: "puuid is required" }, { status: 400 });
	if (!queue)
		return NextResponse.json(
			{ error: `queue must be one of: ${QUEUE_FILTERS.join(", ")}` },
			{ status: 400 },
		);

	try {
		const rows = await queryChampionStats(puuid, queue);
		return NextResponse.json(rows.map(toChampionStat));
	} catch (error) {
		console.error("[api/champion-stats] query failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
