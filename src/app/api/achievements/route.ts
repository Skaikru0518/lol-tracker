import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { detectAchievements } from "@/lib/achievements/detect";

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
	const { puuid, matches, ranked } = body;

	if (!puuid || !matches) {
		return NextResponse.json(
			{ error: "puuid and matches are required" },
			{ status: 400 },
		);
	}

	const earnedIds = detectAchievements({ matches, puuid, ranked });

	// upsert each earned achievement (skip duplicates)
	for (const achievementId of earnedIds) {
		try {
			await prisma.playerAchievement.upsert({
				where: { puuid_achievementId: { puuid, achievementId } },
				update: {},
				create: { puuid, achievementId },
			});
		} catch (e: unknown) {
			// Skip unique constraint violations (P2002) from race conditions
			if (e instanceof Error && "code" in e && (e as { code: string }).code === "P2002") continue;
			throw e;
		}
	}

	// Remove achievements no longer earned
	await prisma.playerAchievement.deleteMany({
		where: {
			puuid,
			achievementId: { notIn: earnedIds },
		},
	});

	// return all achievement for players
	const all = await prisma.playerAchievement.findMany({
		where: { puuid },
		select: { achievementId: true, earnedAt: true },
	});

	return NextResponse.json(all);
}
