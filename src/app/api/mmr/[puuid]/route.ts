import { NextRequest, NextResponse } from "next/server";
import { mmrEstimates } from "@/lib/summoner/profile/mmr";
import { withApiLog } from "@/lib/server/log";
import { type MmrEstimates } from "@/lib/validators/mmr";

async function getHandler(_req: NextRequest, { params }: { params: Promise<{ puuid: string }> }): Promise<NextResponse<MmrEstimates | { error: string }>> {
	try {
		return NextResponse.json(await mmrEstimates((await params).puuid));
	} catch (error) {
		console.error("[api/mmr] failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export const GET = withApiLog(getHandler);
