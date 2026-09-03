import { prisma } from "@/lib/db";
import { detectAchievements } from "@/lib/achievements/detect";
import { matchSchema } from "@/lib/validators/match";
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
				// Load matches from DB using JSONB containment query
				const dbMatches: { data: unknown }[] = await prisma.$queryRaw`
					SELECT data FROM "Match"
					WHERE data->'metadata'->'participants' @> ${JSON.stringify(account.puuid)}::jsonb
					ORDER BY "gameCreation" DESC
					LIMIT 50
				`;

				const matches = dbMatches.map((m) => matchSchema.parse(m.data));

				// Load ranked from DB
				const ranked = await prisma.rankedEntry.findMany({
					where: { puuid: account.puuid },
				});

				const earnedIds = detectAchievements({
					matches,
					puuid: account.puuid,
					ranked,
				});

				for (const achievementId of earnedIds) {
					await prisma.playerAchievement.upsert({
						where: {
							puuid_achievementId: {
								puuid: account.puuid,
								achievementId,
							},
						},
						update: {},
						create: { puuid: account.puuid, achievementId },
					});
					totalAwarded++;
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
