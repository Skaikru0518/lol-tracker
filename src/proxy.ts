import { NextResponse, type NextRequest } from "next/server";
import { logPath } from "@/lib/server/log";

export function proxy(request: NextRequest) {
	if (!request.headers.has("next-router-prefetch")) {
		console.log(`[page] ${request.method} ${logPath(request.url)}`);
	}
	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
