import { NextRequest, NextResponse } from "next/server";
import { apexCutoffs } from "@/lib/summoner/profile/apex-cutoffs-store";
import { withApiLog } from "@/lib/server/log";
import { type ApexCutoffs } from "@/lib/validators/apex";

async function getHandler(_req: NextRequest): Promise<NextResponse<ApexCutoffs | { error: string }>> {
	try {
		return NextResponse.json(await apexCutoffs());
	} catch (error) {
		console.error("[api/ranked/apex-cutoffs] failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export const GET = withApiLog(getHandler);
