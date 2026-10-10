const DEFAULT_COUNT = 20;
const MAX_COUNT = 100;

/** `count` query param clamped to 1..100; defaults to 20 when missing or not a number. */
export function parseMatchCount(raw: string | null): number {
	const n = Number.parseInt(raw ?? "", 10);
	if (Number.isNaN(n)) return DEFAULT_COUNT;
	return Math.min(Math.max(n, 1), MAX_COUNT);
}

/** `championId` query param: undefined when missing, null when not a positive integer. */
export function parseChampionId(raw: string | null): number | null | undefined {
	if (raw === null) return undefined;
	const n = Number(raw);
	return Number.isInteger(n) && n > 0 ? n : null;
}
