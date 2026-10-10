export type LpRange = "7d" | "30d" | "season";

export const LP_RANGES: readonly LpRange[] = ["7d", "30d", "season"];

export const SEASON_START = new Date("2026-01-08T00:00:00Z");

export const RANGE_SNAPSHOT_LIMIT = 2000;

const DAY_MS = 24 * 60 * 60 * 1000;

/** `?range=` value; missing keeps the legacy last-100 behaviour, unknown values return `null`. */
export function parseLpRange(value: string | null): LpRange | "legacy" | null {
	if (value === null) return "legacy";
	return (LP_RANGES as readonly string[]).includes(value) ? (value as LpRange) : null;
}

/** First instant included in a range. */
export function lpRangeStart(range: LpRange, now: Date): Date {
	if (range === "season") return SEASON_START;
	const days = range === "7d" ? 7 : 30;
	return new Date(now.getTime() - days * DAY_MS);
}
