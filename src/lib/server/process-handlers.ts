/** Logs crashes the server would otherwise die from silently: rejections stay logged only, uncaught exceptions still exit. */
export function registerProcessHandlers() {
	process.on("unhandledRejection", (reason) => {
		console.error("[process] unhandled rejection:", reason);
	});
	process.on("uncaughtException", (error, origin) => {
		console.error(`[process] uncaught exception (${origin}), exiting:`, error);
		process.exit(1);
	});
}
