import { logPath } from "@/lib/server/log";
import { RateLimiter, type RateWindow } from "./rate-limiter";

const RIOT_API_KEY = process.env.RIOT_API_KEY!;
export const BASE_URL = "https://eun1.api.riotgames.com";
export const EURPOE_URL = "https://europe.api.riotgames.com";

// Key limit is 20 / 1 s and 100 / 2 min; slightly lower for clock drift
const RIOT_WINDOWS: RateWindow[] = [
	{ limit: 18, ms: 1000 },
	{ limit: 95, ms: 120_000 },
];
const MAX_WAIT_MS = 5000;
const DEFAULT_RETRY_SECONDS = 5;
const HOLD_LOG_INTERVAL_MS = 10_000;

export class RiotApiError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message);
	}
}

// Riot counts limits per routing host, so eun1 and europe each get a limiter
const limiters = new Map<string, RateLimiter>();
let lastHoldLog = 0;

function limiterFor(url: string): RateLimiter {
	const { host } = new URL(url);
	let limiter = limiters.get(host);
	if (!limiter) {
		limiter = new RateLimiter(RIOT_WINDOWS);
		limiters.set(host, limiter);
	}
	return limiter;
}

export async function riotFetch<T>(url: string): Promise<T> {
	const limiter = limiterFor(url);
	if (!(await limiter.acquire(MAX_WAIT_MS))) {
		if (Date.now() - lastHoldLog > HOLD_LOG_INTERVAL_MS) {
			lastHoldLog = Date.now();
			console.warn(`[riot] held back locally (rate limit), next free in ${Math.ceil(limiter.waitTime() / 1000)}s: ${logPath(url)}`);
		}
		throw new RiotApiError(429, "Rate limit exceeded");
	}

	const res = await fetch(url, {
		headers: { "X-Riot-Token": RIOT_API_KEY },
		cache: "no-store",
	});

	if (!res.ok) {
		const retryAfter = res.headers.get("retry-after");
		if (res.status === 429) limiter.block(Number(retryAfter) || DEFAULT_RETRY_SECONDS);
		if (res.status !== 404) console.warn(`[riot] ${res.status} ${logPath(url)}${retryAfter ? ` retry-after=${retryAfter}s` : ""}`);
		const messages: Record<number, string> = {
			401: "Invalid API key",
			403: "Forbidden",
			404: "Not Found",
			429: "Rate limit exceeded",
		};
		throw new RiotApiError(
			res.status,
			messages[res.status] ?? `Riot API error: ${res.status}`,
		);
	}

	return (await res.json()) as T;
}
