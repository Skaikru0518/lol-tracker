import { getMatchById } from "@/lib/riot/matches";
import { RiotApiError } from "@/lib/riot/riot";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	try {
		const match = await getMatchById(id);
		return NextResponse.json(match);
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
