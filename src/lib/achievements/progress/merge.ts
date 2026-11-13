import { type ProgressResult, type StoredProgress } from "./types";

/** New value (the highest one for peaks), the higher tier, and a `now` date for each tier reached for the first time. */
export function mergeProgress(stored: StoredProgress | undefined, computed: ProgressResult, now: Date, { keepHighestValue = false } = {}): StoredProgress {
	const reachedAt = stored?.reachedAt ?? [];
	const tier = Math.max(stored?.tier ?? 0, computed.tier);
	return {
		...computed,
		value: keepHighestValue && stored ? Math.max(stored.value, computed.value) : computed.value,
		tier,
		reachedAt: [...reachedAt, ...Array.from({ length: Math.max(0, tier - reachedAt.length) }, () => now)],
	};
}

export function progressChanged(stored: StoredProgress | undefined, merged: StoredProgress): boolean {
	return (
		!stored ||
		stored.value !== merged.value ||
		stored.tier !== merged.tier ||
		stored.reachedAt.length !== merged.reachedAt.length ||
		stored.reachedAt.some((d, i) => d.getTime() !== merged.reachedAt[i].getTime())
	);
}
