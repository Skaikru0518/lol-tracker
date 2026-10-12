import { prisma } from "@/lib/server/db";
import { getRankedByPuuid } from "@/lib/riot/ranked";
import { RiotApiError } from "@/lib/riot/riot";
import { getAppSetting, setAppSetting } from "@/lib/server/app-settings";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";
import { saveRankedEntries } from "@/lib/summoner/profile/ranked";
import { isRateLimited, nextBatch, RANKED_CRON_BATCH, RANKED_CRON_CURSOR_KEY } from "@/lib/summoner/profile/ranked-cron";
import { NextResponse } from "next/server";
import { withApiLog } from "@/lib/server/log";

/** Refreshes ranks for the next batch of tracked accounts, resuming where the last run stopped; stops at the first 429. */
async function getHandler(req: Request) {
	if (!isAuthorizedCronRequest(req)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const accounts = await prisma.account.findMany({
			where: { gameName: { not: "" } },
			select: { puuid: true },
			orderBy: { puuid: "asc" },
		});
		const batch = nextBatch(
			accounts.map((a) => a.puuid),
			await getAppSetting(RANKED_CRON_CURSOR_KEY),
			RANKED_CRON_BATCH,
		);

		let snapshotsCreated = 0;
		let processed = 0;
		let lastDone: string | null = null;
		let rateLimited = false;

		for (const puuid of batch) {
			try {
				const entries = await getRankedByPuuid(puuid);
				snapshotsCreated += await saveRankedEntries(puuid, entries);
			} catch (error) {
				if (isRateLimited(error)) {
					rateLimited = true;
					console.warn(`[cron/ranked] rate limited after ${processed} accounts; resuming next run`);
					break;
				}
				if (!(error instanceof RiotApiError && error.status === 404)) {
					console.error("[cron/ranked] account failed:", error);
				}
			}
			processed += 1;
			lastDone = puuid;
		}

		if (lastDone) await setAppSetting(RANKED_CRON_CURSOR_KEY, lastDone);

		return NextResponse.json({
			ok: true,
			accounts: accounts.length,
			processed,
			snapshotsCreated,
			rateLimited,
		});
	} catch (error) {
		console.error("[cron/ranked] run failed:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export const GET = withApiLog(getHandler);
