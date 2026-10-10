import { RiotApiError } from "@/lib/riot/riot";
import { resolveRankedEntries } from "@/lib/summoner/ranked";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const puuid = req.nextUrl.searchParams.get("puuid");
	const force = req.nextUrl.searchParams.get("force") === "true";

	if (!puuid)
		return NextResponse.json({ error: "puuid is required" }, { status: 400 });

	try {
		return NextResponse.json(await resolveRankedEntries(puuid, { force }));
	} catch (error) {
		if (error instanceof RiotApiError)
			return NextResponse.json({ error: error.message }, { status: error.status });

		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
