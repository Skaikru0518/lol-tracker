import { NextRequest, NextResponse } from "next/server";
import { performanceSummaries } from "@/lib/performance/batch";
import { withApiLog } from "@/lib/server/log";
import { type PerformanceSummaries } from "@/lib/validators/performance";

const MAX_MATCHES = 100;

async function getHandler(req: NextRequest): Promise<NextResponse<PerformanceSummaries | { error: string }>> {
	const puuid = req.nextUrl.searchParams.get("puuid");
	const ids = [...new Set((req.nextUrl.searchParams.get("matchIds") ?? "").split(",").filter(Boolean))];
	if (!puuid || ids.length === 0) return NextResponse.json({ error: "puuid and matchIds required" }, { status: 400 });
	if (ids.length > MAX_MATCHES) return NextResponse.json({ error: `at most ${MAX_MATCHES} matchIds` }, { status: 400 });

	try {
		return NextResponse.json(await performanceSummaries(ids, puuid));
	} catch (error) {
		console.error("[api/performance/summary] failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export const GET = withApiLog(getHandler);
