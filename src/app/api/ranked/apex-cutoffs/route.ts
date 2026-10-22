import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_PLATFORM, isPlatform } from "@/lib/game/platforms";
import { apexCutoffs } from "@/lib/summoner/profile/apex-cutoffs-store";
import { withApiLog } from "@/lib/server/log";
import { type ApexCutoffs } from "@/lib/validators/apex";

async function getHandler(req: NextRequest): Promise<NextResponse<ApexCutoffs | { error: string }>> {
	try {
		const param = req.nextUrl.searchParams.get("platform");
		return NextResponse.json(await apexCutoffs(isPlatform(param) ? param : DEFAULT_PLATFORM));
	} catch (error) {
		console.error("[api/ranked/apex-cutoffs] failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export const GET = withApiLog(getHandler);
