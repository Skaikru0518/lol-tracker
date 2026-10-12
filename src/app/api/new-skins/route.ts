import { NextResponse } from "next/server";
import { getNewSkins } from "@/lib/home/new-skins-server";
import { type NewSkins } from "@/lib/validators/new-skins";
import { withApiLog } from "@/lib/server/log";

/** Skins added in the current patch, cached for seven days. */
async function getHandler(): Promise<NextResponse<NewSkins | { error: string }>> {
	try {
		return NextResponse.json(await getNewSkins(), { headers: { "Cache-Control": "public, max-age=3600" } });
	} catch (error) {
		console.error("[api/new-skins] failed:", error);
		return NextResponse.json({ error: "New skins unavailable" }, { status: 502 });
	}
}

export const GET = withApiLog(getHandler);
