import { NextResponse } from "next/server";
import { getNewSkins } from "@/lib/new-skins-server";
import { type NewSkins } from "@/lib/validators/new-skins";

/** Skins added in the current patch, cached for seven days. */
export async function GET(): Promise<NextResponse<NewSkins | { error: string }>> {
	try {
		return NextResponse.json(await getNewSkins(), { headers: { "Cache-Control": "public, max-age=3600" } });
	} catch (error) {
		console.error("[api/new-skins] failed:", error);
		return NextResponse.json({ error: "New skins unavailable" }, { status: 502 });
	}
}
