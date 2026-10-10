/** One auto-refresh timer tick: whether a refresh is due, the next deadline and seconds left to show. */
export function refreshTick(
	now: number,
	deadline: number,
	intervalMs: number,
): { due: boolean; deadline: number; secondsLeft: number } {
	if (now < deadline) {
		return { due: false, deadline, secondsLeft: Math.ceil((deadline - now) / 1000) };
	}
	const next = now + intervalMs;
	return { due: true, deadline: next, secondsLeft: Math.ceil(intervalMs / 1000) };
}
