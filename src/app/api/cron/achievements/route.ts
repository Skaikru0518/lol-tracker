import { prisma } from "@/lib/db";
import { detectAchievements } from "@/lib/achievements/detect";
import { loadAchievementMatches } from "@/lib/achievements/query";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
	if (!isAuthorizedCronRequest(req)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const accounts = await prisma.account.findMany({
			where: { gameName: { not: "" } },
			select: { puuid: true },
		});

		let totalAwarded = 0;

		for (const account of accounts) {
			try {
				const matches = await loadAchievementMatches(account.puuid);

				// Load ranked from DB
				const ranked = await prisma.rankedEntry.findMany({
					where: { puuid: account.puuid },
				});

				const earnedIds = detectAchievements({
					matches,
					puuid: account.puuid,
					ranked,
				});

				if (earnedIds.length > 0) {
					const inserted = await prisma.playerAchievement.createMany({
						data: earnedIds.map((achievementId) => ({
							puuid: account.puuid,
							achievementId,
						})),
						skipDuplicates: true,
					});
					totalAwarded += inserted.count;
				}

				// Remove achievements no longer earned
				await prisma.playerAchievement.deleteMany({
					where: {
						puuid: account.puuid,
						achievementId: { notIn: earnedIds },
					},
				});
			} catch {
				// Skip individual account errors
			}
		}

		return NextResponse.json({
			ok: true,
			accounts: accounts.length,
			totalAwarded,
		});
	} catch {
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
