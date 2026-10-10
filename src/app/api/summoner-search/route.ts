import { NextRequest, NextResponse } from "next/server";
import { parseSearchTerms } from "@/lib/summoner/search-query";
import { searchSummoners } from "@/lib/summoner/search";
import { type RecentSearch } from "@/lib/validators/recent-searches";

/** Summoner name suggestions from stored accounts; short input returns an empty list without a query. */
export async function GET(req: NextRequest): Promise<NextResponse<RecentSearch[] | { error: string }>> {
	const terms = parseSearchTerms(req.nextUrl.searchParams.get("q") ?? "");
	if (!terms) return NextResponse.json([]);
	try {
		return NextResponse.json(await searchSummoners(terms), { headers: { "Cache-Control": "private, max-age=30" } });
	} catch (error) {
		console.error("[api/summoner-search] query failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
