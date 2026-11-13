import { prisma } from "@/lib/server/db";
import { detectAchievements } from "@/lib/achievements/profile/detect";
import { loadAchievementMatches } from "@/lib/achievements/profile/query";
import { ACHIEVEMENT_RUN_KEY, nextRunState, parseRunState, planAchievementRun } from "@/lib/achievements/progress/cron-plan";
import { changedPuuids } from "@/lib/achievements/progress/query";
import { saveRarity } from "@/lib/achievements/progress/rarity";
import { recomputeProgress } from "@/lib/achievements/progress/save";
import { getAppSetting, setAppSetting } from "@/lib/server/app-settings";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";
import { NextResponse } from "next/server";
import { withApiLog } from "@/lib/server/log";

async function getHandler(req: Request) {
	if (!isAuthorizedCronRequest(req)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		// Changes written while the run is going are picked up by the next run, so the window starts here
		const startedAt = new Date();
		const state = parseRunState(await getAppSetting(ACHIEVEMENT_RUN_KEY));
		const plan = planAchievementRun(state, startedAt, new URL(req.url).searchParams.get("full") === "1");
		const all = await prisma.account.findMany({
			where: { gameName: { not: "" } },
			select: { puuid: true },
		});
		const changed = plan.since ? await changedPuuids(plan.since) : null;
		const accounts = changed ? all.filter((a) => changed.has(a.puuid)) : all;

		let totalAwarded = 0;

		for (const account of accounts) {
			try {
				const matches = await loadAchievementMatches(account.puuid);

				const earnedIds = detectAchievements({
					matches,
					puuid: account.puuid,
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

				await recomputeProgress(account.puuid);
			} catch (error) {
				console.error(`[cron/achievements] failed for ${account.puuid}:`, error);
			}
		}

		await saveRarity();
		await setAppSetting(ACHIEVEMENT_RUN_KEY, JSON.stringify(nextRunState(state, plan, startedAt)));

		return NextResponse.json({
			ok: true,
			full: plan.full,
			accounts: all.length,
			processed: accounts.length,
			totalAwarded,
		});
	} catch (error) {
		console.error("[cron/achievements] run failed:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export const GET = withApiLog(getHandler);
