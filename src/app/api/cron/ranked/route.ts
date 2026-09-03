import { prisma } from "@/lib/db";
import { getRankedByPuuid } from "@/lib/riot/ranked";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
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

				for (const entry of entries) {
					// Upsert ranked entry
					await prisma.rankedEntry.upsert({
						where: {
							puuid_queueType: {
								puuid: account.puuid,
								queueType: entry.queueType,
							},
						},
						update: {
							tier: entry.tier,
							rank: entry.rank,
							leaguePoints: entry.leaguePoints,
							wins: entry.wins,
							losses: entry.losses,
							hotStreak: entry.hotStreak,
							veteran: entry.veteran,
							freshBlood: entry.freshBlood,
							inactive: entry.inactive,
						},
						create: {
							puuid: account.puuid,
							queueType: entry.queueType,
							tier: entry.tier,
							rank: entry.rank,
							leaguePoints: entry.leaguePoints,
							wins: entry.wins,
							losses: entry.losses,
							hotStreak: entry.hotStreak,
							veteran: entry.veteran,
							freshBlood: entry.freshBlood,
							inactive: entry.inactive,
						},
					});

					// LP snapshot — only if changed
					const lastSnapshot = await prisma.lPHistory.findFirst({
						where: {
							puuid: account.puuid,
							queueType: entry.queueType,
						},
						orderBy: { createdAt: "desc" },
					});

					if (
						!lastSnapshot ||
						lastSnapshot.tier !== entry.tier ||
						lastSnapshot.rank !== entry.rank ||
						lastSnapshot.lp !== entry.leaguePoints
					) {
						await prisma.lPHistory.create({
							data: {
								puuid: account.puuid,
								queueType: entry.queueType,
								tier: entry.tier,
								rank: entry.rank,
								lp: entry.leaguePoints,
								wins: entry.wins,
								losses: entry.losses,
							},
						});
						snapshotsCreated++;
					}
				}
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
