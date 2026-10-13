import { NextRequest, NextResponse } from "next/server";
import { recentPerformance } from "@/lib/performance/recent";
import { withApiLog } from "@/lib/server/log";
import { type RecentSummaryPayload } from "@/lib/validators/performance";

async function getHandler(req: NextRequest): Promise<NextResponse<RecentSummaryPayload | { error: string }>> {
	const puuid = req.nextUrl.searchParams.get("puuid");
	if (!puuid) return NextResponse.json({ error: "puuid required" }, { status: 400 });
	try {
		return NextResponse.json(await recentPerformance(puuid));
	} catch (error) {
		console.error("[api/performance/recent] failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export const GET = withApiLog(getHandler);
