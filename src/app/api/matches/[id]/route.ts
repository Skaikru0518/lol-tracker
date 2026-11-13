import { getMatchById } from "@/lib/riot/matches";
import { RiotApiError } from "@/lib/riot/riot";
import { prisma } from "@/lib/server/db";
import { projectedMatchSql, projectMatch } from "@/lib/match/projection";
import { NextRequest, NextResponse } from "next/server";
import { withApiLog } from "@/lib/server/log";

async function getHandler(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	try {
		const [cached] = await prisma.$queryRaw<{ data: unknown }[]>`SELECT ${projectedMatchSql()} AS data FROM "Match" WHERE "matchId" = ${id}`;
		if (cached) {
			return NextResponse.json(cached.data);
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

export const GET = withApiLog(getHandler);
