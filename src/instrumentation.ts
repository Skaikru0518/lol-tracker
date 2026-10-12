import { type Instrumentation } from "next";

/** Node-only crash logging; imported lazily so the Edge build never sees `process.on`. */
export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		const { registerProcessHandlers } = await import("./lib/server/process-handlers");
		registerProcessHandlers();
	}
}

/** Server render, route and proxy errors with their digest, so a digest on the error page can be found in the logs. */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
	const { digest } = error as Error & { digest?: string };
	const path = request.path.split("?")[0];
	console.error(`[error] ${request.method} ${path} ${context.routeType} ${context.routePath} digest=${digest ?? "-"}:`, error);
};
