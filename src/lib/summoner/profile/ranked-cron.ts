import { RiotApiError } from "@/lib/riot/riot";

/** Accounts refreshed per ranked cron run, so most of the Riot rate limit stays free for visitors. */
export const RANKED_CRON_BATCH = 40;
/** AppSettings key holding the last account the ranked cron refreshed. */
export const RANKED_CRON_CURSOR_KEY = "ranked-cron-cursor";

/** The next `size` ids after `cursor` in sorted `ids`, wrapping around, each at most once. */
export function nextBatch(ids: string[], cursor: string | null, size: number): string[] {
	const start = cursor === null ? 0 : ids.findIndex((id) => id > cursor);
	const from = start === -1 ? 0 : start;
	const rotated = [...ids.slice(from), ...ids.slice(0, from)];
	return rotated.slice(0, size);
}

export function isRateLimited(error: unknown): boolean {
	return error instanceof RiotApiError && error.status === 429;
}
