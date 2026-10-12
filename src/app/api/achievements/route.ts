import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { loadAchievementPayload } from "@/lib/achievements/payload";
import { detectAchievements } from "@/lib/achievements/profile/detect";
import { loadAchievementMatches } from "@/lib/achievements/profile/query";
import { recomputeProgress } from "@/lib/achievements/progress/save";
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
	const { puuid } = await req.json();
	if (!puuid) return NextResponse.json({ error: "puuid is required" }, { status: 400 });

	try {
		const earnedIds = detectAchievements({ matches: await loadAchievementMatches(puuid), puuid });
		if (earnedIds.length > 0) {
			await prisma.playerAchievement.createMany({ data: earnedIds.map((achievementId) => ({ puuid, achievementId })), skipDuplicates: true });
		}
		await prisma.playerAchievement.deleteMany({ where: { puuid, achievementId: { notIn: earnedIds } } });
		await recomputeProgress(puuid);
	} catch (error) {
		console.error("[api/achievements] detection failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}

	return NextResponse.json(await loadAchievementPayload(puuid));
}

export const GET = withApiLog(getHandler);
export const POST = withApiLog(postHandler);
