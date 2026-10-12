import { RiotApiError } from "@/lib/riot/riot";

export const RANKED_CRON_BATCH = 40;
export const RANKED_CRON_CURSOR_KEY = "ranked-cron-cursor";
export const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** The next `size` ids after `cursor`, wrapping around. */
export function nextBatch(ids: string[], cursor: string | null, size: number): string[] {
	const start = cursor === null ? 0 : ids.findIndex((id) => id > cursor);
	const from = start === -1 ? 0 : start;
	const rotated = [...ids.slice(from), ...ids.slice(0, from)];
	return rotated.slice(0, size);
}

// Players with a recent LP change are likely mid-session, so they are refreshed every run to keep one snapshot per game
export function planRankedRun(ids: string[], activeIds: Set<string>, cursor: string | null, size: number): { active: string[]; rotation: string[] } {
	const active = ids.filter((id) => activeIds.has(id)).slice(0, size);
	const rest = ids.filter((id) => !activeIds.has(id));
	return { active, rotation: nextBatch(rest, cursor, size - active.length) };
}

export function isRateLimited(error: unknown): boolean {
	return error instanceof RiotApiError && error.status === 429;
}
