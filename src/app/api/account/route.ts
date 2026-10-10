import { RiotApiError } from "@/lib/riot/riot";
import { resolveAccount } from "@/lib/summoner/profile/account";
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
		return NextResponse.json(await resolveAccount(gameName, tagLine));
	} catch (error) {
		if (error instanceof RiotApiError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		console.error("[api/account] Unhandled error:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
