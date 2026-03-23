import { RiotApiError } from "@/lib/riot/riot";
import { getAccountById } from "@/lib/riot/account";
import { prisma } from "@/lib/db";
import { isRecent, revalidateInBackground } from "@/lib/cache-utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const gameName = req.nextUrl.searchParams.get("gameName");
	const tagLine = req.nextUrl.searchParams.get("tagLine");

	if (!gameName || !tagLine) {
		return NextResponse.json(
			{ error: "gameName and tagLine are required" },
			{ status: 400 },
		);
	}

	try {
		const cached = await prisma.account.findFirst({
			where: { gameName, tagLine },
		});

		if (cached) {
			if (!isRecent(cached.updatedAt, 600)) {
				revalidateInBackground(async () => {
					const account = await getAccountById(gameName, tagLine);
					await prisma.account.upsert({
						where: { puuid: account.puuid },
						update: { gameName: account.gameName, tagLine: account.tagLine },
						create: {
							puuid: account.puuid,
							gameName: account.gameName,
							tagLine: account.tagLine,
						},
					});
				});
			}

			return NextResponse.json({
				puuid: cached.puuid,
				gameName: cached.gameName,
				tagLine: cached.tagLine,
			});
		}

		// Not found in DB — first time, must await Riot API
		const account = await getAccountById(gameName, tagLine);

		await prisma.account.upsert({
			where: { puuid: account.puuid },
			update: { gameName: account.gameName, tagLine: account.tagLine },
			create: {
				puuid: account.puuid,
				gameName: account.gameName,
				tagLine: account.tagLine,
			},
		});

		return NextResponse.json(account);
	} catch (error) {
		if (error instanceof RiotApiError) {
			return NextResponse.json(
				{ error: error.message },
				{ status: error.status },
			);
		}
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
