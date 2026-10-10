import { NextResponse } from "next/server";
import { getRecentSearches } from "@/lib/recent-searches";
import { type RecentSearch } from "@/lib/validators/recent-searches";

export async function GET(): Promise<NextResponse<RecentSearch[] | { error: string }>> {
	try {
		return NextResponse.json(await getRecentSearches());
	} catch (error) {
		console.error("[api/recent-searches] query failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
