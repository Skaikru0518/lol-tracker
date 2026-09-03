import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { detectAchievements } from "@/lib/achievements/detect";
import { loadAchievementMatches } from "@/lib/achievements/query";

export async function GET(
	req: NextRequest,
): Promise<
	| NextResponse<{ error: string }>
	| NextResponse<{ achievementId: string; earnedAt: Date }[]>
> {
	const puuid = req.nextUrl.searchParams.get("puuid");
	if (!puuid) {
		return NextResponse.json({ error: "puuid required" }, { status: 400 });
	}

	const achievement = await prisma.playerAchievement.findMany({
		where: { puuid },
		select: { achievementId: true, earnedAt: true },
	});

	return NextResponse.json(achievement);
}

export async function POST(
	req: NextRequest,
): Promise<
	| NextResponse<{ error: string }>
	| NextResponse<{ achievementId: string; earnedAt: Date }[]>
> {
	const body = await req.json();
	const { puuid } = body;

	if (!puuid) {
		return NextResponse.json(
			{ error: "puuid is required" },
			{ status: 400 },
		);
	}

	let earnedIds: string[];
	try {
		// Matches come from our own DB, projected to the detection fields
		const matches = await loadAchievementMatches(puuid);
		const ranked = await prisma.rankedEntry.findMany({ where: { puuid } });
		earnedIds = detectAchievements({ matches, puuid, ranked });
	} catch (error) {
		console.error("[api/achievements] detection failed:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}

	// One insert for everything newly earned; rows that already exist keep their
	// original earnedAt, which is why duplicates are skipped rather than updated.
	if (earnedIds.length > 0) {
		await prisma.playerAchievement.createMany({
			data: earnedIds.map((achievementId) => ({ puuid, achievementId })),
			skipDuplicates: true,
		});
	}

	// Remove achievements no longer earned
	await prisma.playerAchievement.deleteMany({
		where: {
			puuid,
			achievementId: { notIn: earnedIds },
		},
	});

	// Return all achievements
	const all = await prisma.playerAchievement.findMany({
		where: { puuid },
		select: { achievementId: true, earnedAt: true },
	});

	return NextResponse.json(all);
}
