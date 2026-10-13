import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";
import { withApiLog } from "@/lib/server/log";
import { forceRefreshApexCutoffs } from "@/lib/summoner/profile/apex-cutoffs-store";

async function getHandler(req: Request) {
	if (!isAuthorizedCronRequest(req)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	try {
		return NextResponse.json({ ok: true, cutoffs: await forceRefreshApexCutoffs() });
	} catch (error) {
		console.error("[cron/apex-cutoffs] run failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export const GET = withApiLog(getHandler);
