import { RiotApiError } from "@/lib/riot/riot";
import { getAccountById } from "@/lib/riot/account";
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
		const account = await getAccountById(gameName, tagLine);
		return NextResponse.json(account);
	} catch (error) {
		if (error instanceof RiotApiError) {
			return NextResponse.json(
				{ error: error.message },
				{ status: error.status },
			);
		}
		return NextResponse.json(
			{ error: "Iternal server error" },
			{ status: 500 },
		);
	}
}
