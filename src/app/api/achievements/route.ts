import { NextRequest, NextResponse } from "next/server";
import { loadAchievementPayload } from "@/lib/achievements/payload";
import { refreshAchievements } from "@/lib/achievements/refresh";
import { rateLimited } from "@/lib/server/ip-rate-limit";
import { type AchievementPayload } from "@/lib/validators/achievements";
import { withApiLog } from "@/lib/server/log";

type Response = NextResponse<{ error: string }> | NextResponse<AchievementPayload>;

async function getHandler(req: NextRequest): Promise<Response> {
	const puuid = req.nextUrl.searchParams.get("puuid");
	if (!puuid) return NextResponse.json({ error: "puuid required" }, { status: 400 });

	return NextResponse.json(await loadAchievementPayload(puuid));
}

/** Recomputes Current form, milestones and seasons for one account, then returns its payload. */
async function postHandler(req: NextRequest): Promise<Response> {
	if (rateLimited(req, "achievements")) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
	const { puuid } = await req.json();
	if (!puuid) return NextResponse.json({ error: "puuid is required" }, { status: 400 });

	try {
		await refreshAchievements(puuid);
	} catch (error) {
		console.error("[api/achievements] detection failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}

	return NextResponse.json(await loadAchievementPayload(puuid));
}

export const GET = withApiLog(getHandler);
export const POST = withApiLog(postHandler);
