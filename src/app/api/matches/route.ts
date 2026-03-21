import { NextRequest, NextResponse } from "next/server";
import { getMatchIdsByPuuid, getMatchById } from "@/lib/riot/matches";
import { RiotApiError } from "@/lib/riot/riot";

export async function GET(req: NextRequest) {
	const puuid = req.nextUrl.searchParams.get("puuid");
	const count = req.nextUrl.searchParams.get("count") ?? "20";
	const championId = req.nextUrl.searchParams.get("championId");

	if (!puuid)
		return NextResponse.json({ error: "puuid is required" }, { status: 400 });

	try {
		const matchIds = await getMatchIdsByPuuid(
			puuid,
			parseInt(count),
			championId ? parseInt(championId) : undefined,
		);
		const matches = [];
		for (const id of matchIds) {
			matches.push(await getMatchById(id));
		}
		return NextResponse.json(matches);
	} catch (error) {
		if (error instanceof RiotApiError)
			return NextResponse.json(
				{ error: error.message },
				{ status: error.status },
			);

		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
