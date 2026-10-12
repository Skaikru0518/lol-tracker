import { prisma } from "@/lib/server/db";
import { getRankedByPuuid } from "@/lib/riot/ranked";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";
import { saveRankedEntries } from "@/lib/summoner/profile/ranked";
import { NextResponse } from "next/server";
import { withApiLog } from "@/lib/server/log";

async function getHandler(req: Request) {
	if (!isAuthorizedCronRequest(req)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		// Get all accounts that have been looked up
		const accounts = await prisma.account.findMany({
			where: { gameName: { not: "" } },
			select: { puuid: true, gameName: true },
		});

		let snapshotsCreated = 0;

		for (const account of accounts) {
			try {
				const entries = await getRankedByPuuid(account.puuid);
				snapshotsCreated += await saveRankedEntries(account.puuid, entries);
			} catch {
				// Skip individual account errors (e.g. unranked)
			}
		}

		return NextResponse.json({
			ok: true,
			accounts: accounts.length,
			snapshotsCreated,
		});
	} catch {
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export const GET = withApiLog(getHandler);
