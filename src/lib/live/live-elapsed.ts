/** Seconds since a live game started; uses Riot's `gameLength` until the start time is known. */
export function liveElapsedSeconds(
	gameStartTime: number | undefined,
	gameLength: number | undefined,
	now: number,
): number {
	if (gameStartTime && gameStartTime > 0) {
		return Math.max(0, Math.floor((now - gameStartTime) / 1000));
	}
	return Math.max(0, gameLength ?? 0);
}
