import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { detectMatchBadges } from "@/lib/match-badges/detect";
import { matchSchema } from "@/lib/validators/match";

export async function GET(req: NextRequest) {
	const matchIdsParam = req.nextUrl.searchParams.get("matchIds");
	if (!matchIdsParam)
		return NextResponse.json({ error: "matchIds required" }, { status: 400 });

	const matchIds = matchIdsParam.split(",").filter(Boolean);
	if (matchIds.length === 0) return NextResponse.json({});

	// Fetch all existing badges in one query
	const existing = await prisma.matchBadge.findMany({
		where: { matchId: { in: matchIds } },
		select: { matchId: true, puuid: true, badgeId: true },
	});

	// Group by matchId
	const result: Record<string, { puuid: string; badgeId: string }[]> = {};
	const computedMatchIds = new Set<string>();

	for (const badge of existing) {
		if (!result[badge.matchId]) result[badge.matchId] = [];
		result[badge.matchId].push({ puuid: badge.puuid, badgeId: badge.badgeId });
		computedMatchIds.add(badge.matchId);
	}

	// Find matches that need badge computation
	const missingIds = matchIds.filter((id) => !computedMatchIds.has(id));

	if (missingIds.length > 0) {
		// Batch load match data
		const matches = await prisma.match.findMany({
			where: { matchId: { in: missingIds } },
		});

		// Detect badges for all missing matches in parallel
		const allNewBadges: { matchId: string; puuid: string; badgeId: string }[] = [];

		for (const match of matches) {
			try {
				const parsed = matchSchema.parse(match.data);
				const badges = detectMatchBadges(parsed.info.participants, parsed.info.gameDuration);
				result[match.matchId] = badges;
				for (const b of badges) {
					allNewBadges.push({ matchId: match.matchId, puuid: b.puuid, badgeId: b.badgeId });
				}
			} catch {
				result[match.matchId] = [];
			}
		}

		// Bulk insert all new badges at once
		if (allNewBadges.length > 0) {
			await prisma.matchBadge.createMany({
				data: allNewBadges,
				skipDuplicates: true,
			});
		}
	}

	// Ensure all requested matchIds have an entry
	for (const id of matchIds) {
		if (!result[id]) result[id] = [];
	}

	return NextResponse.json(result);
}
