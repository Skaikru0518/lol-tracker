import { type Instrumentation } from "next";

// Dynamic import keeps process.on out of the Edge build
export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		const { registerProcessHandlers } = await import("./lib/server/process-handlers");
		registerProcessHandlers();
	}
}

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
	const { digest } = error as Error & { digest?: string };
	const path = request.path.split("?")[0];
	console.error(`[error] ${request.method} ${path} ${context.routeType} ${context.routePath} digest=${digest ?? "-"}:`, error);
};
