import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { detectAchievements } from "@/lib/achievements/detect";
import { matchSchema } from "@/lib/validators/match";

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

	// Load matches from DB instead of receiving them in the body
	const dbMatches: { data: unknown }[] = await prisma.$queryRaw`
		SELECT data FROM "Match"
		WHERE data->'info'->'participants' @> ${JSON.stringify([{ puuid }])}::jsonb
		ORDER BY "gameCreation" DESC
		LIMIT 50
	`;

	const matches = dbMatches.map((m) => matchSchema.parse(m.data));

	// Load ranked from DB
	const ranked = await prisma.rankedEntry.findMany({
		where: { puuid },
	});

	const earnedIds = detectAchievements({ matches, puuid, ranked });

	// Upsert each earned achievement (skip duplicates)
	for (const achievementId of earnedIds) {
		try {
			await prisma.playerAchievement.upsert({
				where: { puuid_achievementId: { puuid, achievementId } },
				update: {},
				create: { puuid, achievementId },
			});
		} catch (e: unknown) {
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

	// Return all achievements
	const all = await prisma.playerAchievement.findMany({
		where: { puuid },
		select: { achievementId: true, earnedAt: true },
	});

	return NextResponse.json(all);
}
