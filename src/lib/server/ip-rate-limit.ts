const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const SWEEP_AT_KEYS = 10_000;

const hits = new Map<string, number[]>();

function recent(key: string, now: number): number[] {
	return (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
}

// In-memory and per pod: good enough for one replica, not a shared limit
export function allowRequest(key: string, now: number = Date.now()): boolean {
	if (hits.size > SWEEP_AT_KEYS) {
		for (const k of hits.keys()) if (recent(k, now).length === 0) hits.delete(k);
	}
	const times = recent(key, now);
	if (times.length >= MAX_REQUESTS) {
		hits.set(key, times);
		return false;
	}
	times.push(now);
	hits.set(key, times);
	return true;
}

/** Per-IP limit on a route; `scope` gives each route its own budget. */
export function rateLimited(req: Request, scope: string): boolean {
	// Behind Cloudflare the first forwarded IP is whatever the client sent; Cloudflare sets cf-connecting-ip itself
	const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
	return !allowRequest(`${scope}:${ip}`);
}

export function resetRateLimit(): void {
	hits.clear();
}
