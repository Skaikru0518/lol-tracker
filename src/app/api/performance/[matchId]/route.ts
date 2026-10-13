import { NextRequest, NextResponse } from "next/server";
import { performanceForMatch } from "@/lib/performance/batch";
import { withApiLog } from "@/lib/server/log";
import { type MatchPerformance } from "@/lib/validators/performance";

async function getHandler(_req: NextRequest, { params }: { params: Promise<{ matchId: string }> }): Promise<NextResponse<MatchPerformance | { error: string }>> {
	try {
		return NextResponse.json(await performanceForMatch((await params).matchId));
	} catch (error) {
		console.error("[api/performance/match] failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export const GET = withApiLog(getHandler);
