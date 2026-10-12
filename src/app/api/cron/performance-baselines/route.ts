import { NextResponse } from "next/server";
import { computeAndSaveBaselines } from "@/lib/performance/baselines";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";
import { withApiLog } from "@/lib/server/log";

async function getHandler(req: Request) {
	if (!isAuthorizedCronRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	try {
		return NextResponse.json({ ok: true, ...(await computeAndSaveBaselines()) });
	} catch (error) {
		console.error("[cron/performance-baselines] failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export const GET = withApiLog(getHandler);
