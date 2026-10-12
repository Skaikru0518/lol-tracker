import { NextResponse, type NextRequest } from "next/server";
import { logPath } from "@/lib/server/log";

/** One log line per page request; API routes log themselves, prefetches are skipped. */
export function proxy(request: NextRequest) {
	if (!request.headers.has("next-router-prefetch")) {
		console.log(`[page] ${request.method} ${logPath(request.url)}`);
	}
	return NextResponse.next();
}

export const config = {
	// Everything except API routes, Next internals and files with an extension (icons, images, fonts)
	matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
