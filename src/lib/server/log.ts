const MIN_ID_SEGMENT = 30;

/** Pathname without query string; puuid-like segments become `:id`. */
export function logPath(url: string): string {
	const { pathname } = new URL(url);
	return pathname
		.split("/")
		.map((segment) => (segment.length >= MIN_ID_SEGMENT && /^[\w-]+$/.test(segment) ? ":id" : segment))
		.join("/");
}

export function withApiLog<A extends [Request, ...unknown[]], R extends Response>(handler: (...args: A) => Promise<R>): (...args: A) => Promise<R | Response> {
	return async (...args: A) => {
		const [req] = args;
		const started = performance.now();
		const line = (status: number) => `[api] ${req.method} ${logPath(req.url)} ${status} ${Math.round(performance.now() - started)}ms`;
		try {
			const res = await handler(...args);
			console.log(line(res.status));
			return res;
		} catch (error) {
			console.error(`${line(500)} threw:`, error);
			return Response.json({ error: "Internal server error" }, { status: 500 });
		}
	};
}
