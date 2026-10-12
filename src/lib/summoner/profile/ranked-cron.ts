import { RiotApiError } from "@/lib/riot/riot";

export const RANKED_CRON_BATCH = 40;
export const RANKED_CRON_CURSOR_KEY = "ranked-cron-cursor";

/** The next `size` ids after `cursor`, wrapping around. */
export function nextBatch(ids: string[], cursor: string | null, size: number): string[] {
	const start = cursor === null ? 0 : ids.findIndex((id) => id > cursor);
	const from = start === -1 ? 0 : start;
	const rotated = [...ids.slice(from), ...ids.slice(0, from)];
	return rotated.slice(0, size);
}

export function isRateLimited(error: unknown): boolean {
	return error instanceof RiotApiError && error.status === 429;
}
