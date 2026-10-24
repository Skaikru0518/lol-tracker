import { NextRequest, NextResponse } from "next/server";
import { buildOverlayGame } from "@/lib/overlay/overlay-game";
import { RiotApiError } from "@/lib/riot/riot";
import { allowRequest } from "@/lib/server/ip-rate-limit";
import { withApiLog } from "@/lib/server/log";
import { overlayQuerySchema } from "@/lib/validators/overlay";

async function getHandler(req: NextRequest) {
	const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
	if (!allowRequest(ip)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const query = overlayQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
	if (!query.success) return NextResponse.json({ error: "gameName, tagLine, platform and since are required" }, { status: 400 });

	try {
		return NextResponse.json(await buildOverlayGame(query.data));
	} catch (error) {
		if (error instanceof RiotApiError) return NextResponse.json({ error: error.message }, { status: error.status });
		console.error("[api/overlay/game] Unhandled error:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export const GET = withApiLog(getHandler);
