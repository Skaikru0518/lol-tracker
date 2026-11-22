import { NextRequest, NextResponse } from "next/server";
import { duoCompare } from "@/lib/duo/compare-data";
import { rateLimited } from "@/lib/server/ip-rate-limit";
import { withApiLog } from "@/lib/server/log";
import { type DuoComparePayload } from "@/lib/validators/duo";

async function getHandler(req: NextRequest): Promise<NextResponse<DuoComparePayload | { error: string }>> {
	if (rateLimited(req, "duo-compare")) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
	const puuid = req.nextUrl.searchParams.get("puuid");
	const friend = req.nextUrl.searchParams.get("with");
	if (!puuid || !friend || friend === puuid) return NextResponse.json({ error: "puuid and a different with are required" }, { status: 400 });
	try {
		return NextResponse.json(await duoCompare(puuid, friend));
	} catch (error) {
		console.error("[api/duo/compare] failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export const GET = withApiLog(getHandler);
