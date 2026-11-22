import { NextRequest, NextResponse } from "next/server";
import { duoPartners } from "@/lib/duo/partners";
import { loadDuoWindow } from "@/lib/duo/query";
import { rateLimited } from "@/lib/server/ip-rate-limit";
import { withApiLog } from "@/lib/server/log";
import { type DuoPartnerPayload } from "@/lib/validators/duo";

async function getHandler(req: NextRequest): Promise<NextResponse<DuoPartnerPayload[] | { error: string }>> {
	if (rateLimited(req, "duo")) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
	const puuid = req.nextUrl.searchParams.get("puuid");
	if (!puuid) return NextResponse.json({ error: "puuid required" }, { status: 400 });
	try {
		return NextResponse.json(duoPartners(await loadDuoWindow(puuid), puuid));
	} catch (error) {
		console.error("[api/duo] failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export const GET = withApiLog(getHandler);
