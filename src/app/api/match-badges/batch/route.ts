import { NextRequest, NextResponse } from "next/server";
import { badgesForMatches } from "@/lib/achievements/badges/store";
import { withApiLog } from "@/lib/server/log";

async function getHandler(req: NextRequest) {
	const matchIdsParam = req.nextUrl.searchParams.get("matchIds");
	if (!matchIdsParam) return NextResponse.json({ error: "matchIds required" }, { status: 400 });

	const matchIds = matchIdsParam.split(",").filter(Boolean);
	if (matchIds.length === 0) return NextResponse.json({});

	return NextResponse.json(await badgesForMatches(matchIds));
}

export const GET = withApiLog(getHandler);
