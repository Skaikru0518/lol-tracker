import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { detectMatchBadges } from "@/lib/match-badges/detect";
import { matchSchema } from "@/lib/validators/match";

export async function GET(req: NextRequest) {
	const matchId = req.nextUrl.searchParams.get("matchId");
	if (!matchId)
		return NextResponse.json({ error: "matchId required" }, { status: 400 });

	// Check if badges already computed
	const existing = await prisma.matchBadge.findMany({
		where: { matchId },
		select: { puuid: true, badgeId: true },
	});

	if (existing.length > 0) {
		return NextResponse.json(existing);
	}

	// Load match data and compute badges
	const match = await prisma.match.findUnique({
		where: { matchId },
	});

	if (!match) {
		return NextResponse.json({ error: "Match not found" }, { status: 404 });
	}

	const parsed = matchSchema.parse(match.data);
	const badges = detectMatchBadges(parsed.info.participants, parsed.info.gameDuration);

	// Save all badges
	for (const badge of badges) {
		try {
			await prisma.matchBadge.create({
				data: { matchId, puuid: badge.puuid, badgeId: badge.badgeId },
			});
		} catch {
			// Skip duplicates
		}
	}

	return NextResponse.json(badges);
}
