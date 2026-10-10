import { NextRequest, NextResponse } from "next/server";
import { RiotApiError } from "@/lib/riot/riot";
import { resolveTopMasteries } from "@/lib/summoner/mastery";

export async function GET(req: NextRequest) {
	const puuid = req.nextUrl.searchParams.get("puuid");
	const count = req.nextUrl.searchParams.get("count") ?? "5";

	if (!puuid) {
		return NextResponse.json({ error: "puuid is required" }, { status: 400 });
	}

	try {
		return NextResponse.json(await resolveTopMasteries(puuid, parseInt(count)));
	} catch (error) {
		if (error instanceof RiotApiError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
