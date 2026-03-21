import { NextRequest, NextResponse } from "next/server";
import { getMatchTimeline } from "@/lib/riot/matches";
import { RiotApiError } from "@/lib/riot/riot";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;

	try {
		const timeline = await getMatchTimeline(id);
		return NextResponse.json(timeline);
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
