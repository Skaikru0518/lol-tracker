/** `m:ss` from seconds; negative input becomes `0:00`. */
export function formatDuration(seconds: number): string {
	const total = Math.max(0, Math.floor(seconds));
	return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}

/** `13.8k` from 1000 up, a rounded number below. */
export function formatThousands(value: number): string {
	return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${Math.round(value)}`;
}

/** `Just now`, `15m ago`, `3h ago`, `4d ago`; minutes round down to five. */
export function timeAgo(timestamp: number, now: number = Date.now()): string {
	const minutes = Math.floor((now - timestamp) / 60_000);
	if (minutes < 5) return "Just now";
	if (minutes < 60) return `${Math.floor(minutes / 5) * 5}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.floor(hours / 24)}d ago`;
}

/** `(kills + assists) / deaths` to two decimals; `null` means perfect (no deaths). */
export function kdaRatio(kills: number, deaths: number, assists: number): number | null {
	if (deaths === 0) return null;
	return Math.round(((kills + assists) / deaths) * 100) / 100;
}

/** CS per minute to one decimal; 0 for a zero-length game. */
export function csPerMinute(cs: number, durationSeconds: number): number {
	if (durationSeconds <= 0) return 0;
	return Math.round((cs / (durationSeconds / 60)) * 10) / 10;
}
