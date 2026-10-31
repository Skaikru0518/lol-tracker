import { NextRequest, NextResponse } from "next/server";
import { RiotApiError } from "@/lib/riot/riot";
import { allowRequest } from "@/lib/server/ip-rate-limit";
import { withApiLog } from "@/lib/server/log";
import { widgetQuerySchema } from "@/lib/validators/widget";
import { buildWidgetData } from "@/lib/widget/widget-data";

async function getHandler(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
	if (!allowRequest(`widget:${ip}`)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

	const query = widgetQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
	try {
		const data = await buildWidgetData((await params).slug, query);
		if (!data) return NextResponse.json({ error: "Summoner not found" }, { status: 404 });
		return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
	} catch (error) {
		if (error instanceof RiotApiError) return NextResponse.json({ error: error.message }, { status: error.status });
		console.error("[api/widget] Unhandled error:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export const GET = withApiLog(getHandler);
