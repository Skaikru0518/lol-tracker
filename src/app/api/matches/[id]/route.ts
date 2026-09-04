import { getMatchById } from "@/lib/riot/matches";
import { RiotApiError } from "@/lib/riot/riot";
import { prisma } from "@/lib/db";
import { projectMatch } from "@/lib/match-projection";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	try {
		const cached = await prisma.match.findUnique({ where: { matchId: id } });
		if (cached) {
			return NextResponse.json(projectMatch(cached.data));
		}

		const matchData = await getMatchById(id);
		await prisma.match.create({
			data: {
				matchId: id,
				queueId: matchData.info.queueId,
				gameMode: matchData.info.gameMode,
				gameDuration: matchData.info.gameDuration,
				gameCreation: BigInt(matchData.info.gameCreation),
				data: matchData as any,
			},
		});
		return NextResponse.json(projectMatch(matchData));
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
