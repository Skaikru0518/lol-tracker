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

export function resetRateLimit(): void {
	hits.clear();
}
