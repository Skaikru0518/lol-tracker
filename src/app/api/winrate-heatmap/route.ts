import { NextRequest, NextResponse } from "next/server";
import { winrateHeatmap } from "@/lib/lp-history/heatmap";
import { loadRankedResults } from "@/lib/lp-history/heatmap-query";
import { LP_RANGES, lpRangeStart, parseLpRange } from "@/lib/lp-history/range";
import { type WinrateHeatmap } from "@/lib/validators/winrate-heatmap";

/** Ranked win rate per Budapest weekday and 3-hour slot over the LP history range. */
export async function GET(req: NextRequest): Promise<NextResponse<WinrateHeatmap | { error: string }>> {
	const puuid = req.nextUrl.searchParams.get("puuid");
	const range = parseLpRange(req.nextUrl.searchParams.get("range") ?? "season");

	if (!puuid) return NextResponse.json({ error: "puuid is required" }, { status: 400 });
	if (!range || range === "legacy") return NextResponse.json({ error: `range must be one of: ${LP_RANGES.join(", ")}` }, { status: 400 });

	try {
		const results = await loadRankedResults(puuid, lpRangeStart(range, new Date()));
		return NextResponse.json({ cells: winrateHeatmap(results), games: results.length });
	} catch (error) {
		console.error("[api/winrate-heatmap] failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
