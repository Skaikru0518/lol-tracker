import { NextResponse } from "next/server";
import { RiotApiError } from "@/lib/riot/riot";
import { getFreeRotation } from "@/lib/home/rotation";
import { type FreeRotation } from "@/lib/validators/rotation";

export async function GET(): Promise<NextResponse<FreeRotation | { error: string }>> {
	try {
		return NextResponse.json(await getFreeRotation());
	} catch (error) {
		if (error instanceof RiotApiError)
			return NextResponse.json({ error: error.message }, { status: error.status });

		console.error("[api/rotation] failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
