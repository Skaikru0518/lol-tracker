import { NextRequest, NextResponse } from "next/server";
import { getMatchTimeline } from "@/lib/riot/matches";
import { RiotApiError } from "@/lib/riot/riot";
import { prisma } from "@/lib/server/db";
import { withApiLog } from "@/lib/server/log";

const TIMELINE_KEEP_MS = 30 * 24 * 60 * 60 * 1000;

async function getHandler(
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
		// Timelines are ~300 KB each and only opened for recent games; old ones are refetched on demand
		await prisma.matchTimeline.deleteMany({ where: { updatedAt: { lt: new Date(Date.now() - TIMELINE_KEEP_MS) } } });
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

export const GET = withApiLog(getHandler);
