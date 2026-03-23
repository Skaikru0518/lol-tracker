import { NextRequest, NextResponse } from "next/server";
import { getMatchTimeline } from "@/lib/riot/matches";
import { RiotApiError } from "@/lib/riot/riot";
import { prisma } from "@/lib/db";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;

	try {
		const cached = await prisma.matchTimeline.findUnique({ where: { matchId: id } });
		if (cached) {
			return NextResponse.json(cached.data);
		}

		const timelineData = await getMatchTimeline(id);
		await prisma.matchTimeline.create({
			data: {
				matchId: id,
				data: timelineData as any,
			},
		});
		return NextResponse.json(timelineData);
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
