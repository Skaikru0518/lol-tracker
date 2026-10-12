import { NextResponse } from "next/server";
import { getRecentSearches } from "@/lib/home/recent-searches";
import { type RecentSearch } from "@/lib/validators/recent-searches";
import { withApiLog } from "@/lib/server/log";

async function getHandler(): Promise<NextResponse<RecentSearch[] | { error: string }>> {
	try {
		return NextResponse.json(await getRecentSearches());
	} catch (error) {
		console.error("[api/recent-searches] query failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export const GET = withApiLog(getHandler);
