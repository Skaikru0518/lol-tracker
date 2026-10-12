import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { ACHIEVEMENT_QUEUE_IDS, MIN_ACHIEVEMENT_GAME_SECONDS } from "@/lib/achievements/eligibility";
import { detectMatchBadges } from "@/lib/achievements/badges/detect";
import { matchSchema } from "@/lib/validators/match";
import { withApiLog } from "@/lib/server/log";

async function getHandler(req: NextRequest) {
	const matchIdsParam = req.nextUrl.searchParams.get("matchIds");
	if (!matchIdsParam)
		return NextResponse.json({ error: "matchIds required" }, { status: 400 });

	const matchIds = matchIdsParam.split(",").filter(Boolean);
	if (matchIds.length === 0) return NextResponse.json({});

	const result: Record<string, { puuid: string; badgeId: string }[]> = Object.fromEntries(matchIds.map((id) => [id, []]));

	// Only ranked games earn badges, so rows left from other queues are never served
	const eligible = await prisma.match.findMany({
		where: {
			matchId: { in: matchIds },
			queueId: { in: ACHIEVEMENT_QUEUE_IDS },
			gameDuration: { gte: MIN_ACHIEVEMENT_GAME_SECONDS },
		},
		select: { matchId: true },
	});
	const eligibleIds = eligible.map((m) => m.matchId);
	if (eligibleIds.length === 0) return NextResponse.json(result);

	const existing = await prisma.matchBadge.findMany({
		where: { matchId: { in: eligibleIds } },
		select: { matchId: true, puuid: true, badgeId: true },
	});

	const computedMatchIds = new Set<string>();
	for (const badge of existing) {
		result[badge.matchId].push({ puuid: badge.puuid, badgeId: badge.badgeId });
		computedMatchIds.add(badge.matchId);
	}

	const missingIds = eligibleIds.filter((id) => !computedMatchIds.has(id));

	if (missingIds.length > 0) {
		const matches = await prisma.match.findMany({
			where: { matchId: { in: missingIds } },
		});

		const allNewBadges: { matchId: string; puuid: string; badgeId: string }[] = [];

		for (const match of matches) {
			try {
				const parsed = matchSchema.parse(match.data);
				const badges = detectMatchBadges(parsed.info);
				result[match.matchId] = badges;
				for (const b of badges) {
					allNewBadges.push({ matchId: match.matchId, puuid: b.puuid, badgeId: b.badgeId });
				}
			} catch (error) {
				console.error(`[api/match-badges] detection failed for ${match.matchId}:`, error);
			}
		}

		if (allNewBadges.length > 0) {
			await prisma.matchBadge.createMany({
				data: allNewBadges,
				skipDuplicates: true,
			});
		}
	}

	return NextResponse.json(result);
}

export const GET = withApiLog(getHandler);
