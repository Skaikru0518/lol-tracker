import { NextRequest, NextResponse } from "next/server";
import { isPlatform } from "@/lib/game/platforms";
import { toSummonerSlug } from "@/lib/game/riot-id";
import { withApiLog } from "@/lib/server/log";
import { locateAccount } from "@/lib/summoner/profile/locate-summoner";
import { type LocateResult } from "@/lib/validators/locate";

async function getHandler(req: NextRequest): Promise<NextResponse<LocateResult | { error: string }>> {
	const params = req.nextUrl.searchParams;
	const gameName = params.get("gameName");
	const tagLine = params.get("tagLine");
	if (!gameName || !tagLine) return NextResponse.json({ error: "gameName and tagLine are required" }, { status: 400 });
	const hint = params.get("platform");

	try {
		const found = await locateAccount(gameName, tagLine, isPlatform(hint) ? hint : null);
		if (!found) return NextResponse.json({ error: "Not Found" }, { status: 404 });
		return NextResponse.json({ slug: toSummonerSlug(found.account.gameName, found.account.tagLine), platform: found.platform });
	} catch (error) {
		console.error("[api/summoner/locate] failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export const GET = withApiLog(getHandler);
