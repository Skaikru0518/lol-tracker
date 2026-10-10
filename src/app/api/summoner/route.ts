import { RiotApiError } from "@/lib/riot/riot";
import { resolveSummoner } from "@/lib/summoner/summoner";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const puuid = req.nextUrl.searchParams.get("puuid");
	if (!puuid)
		return NextResponse.json({ error: "puuid is required" }, { status: 400 });

	try {
		return NextResponse.json(await resolveSummoner(puuid));
	} catch (error) {
		if (error instanceof RiotApiError)
			return NextResponse.json({ error: error.message }, { status: error.status });

		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
