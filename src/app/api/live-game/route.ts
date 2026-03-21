import { getLiveGame } from "@/lib/riot/spectator";
import { RiotApiError } from "@/lib/riot/riot";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const puuid = req.nextUrl.searchParams.get("puuid");

	if (!puuid)
		return NextResponse.json(
			{ error: "puuid is required" },
			{ status: 400 },
		);

	try {
		const data = await getLiveGame(puuid);
		return NextResponse.json({ inGame: true, ...data });
	} catch (error) {
		if (error instanceof RiotApiError) {
			if (error.status === 404)
				return NextResponse.json({ inGame: false });

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
