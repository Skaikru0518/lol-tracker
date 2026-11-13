import { prisma } from "@/lib/server/db";
import { ACHIEVEMENT_RUN_KEY, nextRunState, parseRunState, planAchievementRun } from "@/lib/achievements/progress/cron-plan";
import { changedPuuids } from "@/lib/achievements/progress/query";
import { saveRarity } from "@/lib/achievements/progress/rarity";
import { refreshAchievements } from "@/lib/achievements/refresh";
import { getAppSetting, setAppSetting } from "@/lib/server/app-settings";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";
import { after, NextResponse } from "next/server";
import { withApiLog } from "@/lib/server/log";

// A full run outlasts Cloudflare's ~100 s response timeout, so the work continues after the response; one run at a time per pod
let running = false;

async function getHandler(req: Request) {
	if (!isAuthorizedCronRequest(req)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	if (running) return NextResponse.json({ ok: true, skipped: "already running" });

	try {
		running = true;
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

		after(async () => {
			try {
				let totalAwarded = 0;
				for (const account of accounts) {
					try {
						totalAwarded += await refreshAchievements(account.puuid);
					} catch (error) {
						console.error(`[cron/achievements] failed for ${account.puuid}:`, error);
					}
				}
				await saveRarity();
				await setAppSetting(ACHIEVEMENT_RUN_KEY, JSON.stringify(nextRunState(state, plan, startedAt)));
				console.log(`[cron/achievements] done: ${accounts.length} accounts, ${totalAwarded} awarded, ${Math.round((Date.now() - startedAt.getTime()) / 1000)}s`);
			} catch (error) {
				console.error("[cron/achievements] run failed:", error);
			} finally {
				running = false;
			}
		});

		return NextResponse.json({ ok: true, started: true, full: plan.full, accounts: all.length, processed: accounts.length });
	} catch (error) {
		running = false;
		console.error("[cron/achievements] run failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export const GET = withApiLog(getHandler);
