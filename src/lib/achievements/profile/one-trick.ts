const MIN_SHARE = 0.5;
const MIN_GAMES = 10;

/** `one-trick:<champion>` when one champion has half or more of the season's ranked games (and 10+ of them). */
export function seasonOneTrick(champions: { championName: string; games: number }[]): string | null {
	const total = champions.reduce((sum, c) => sum + c.games, 0);
	const top = champions.reduce<{ championName: string; games: number } | null>((best, c) => (!best || c.games > best.games ? c : best), null);
	return top && top.games >= MIN_GAMES && top.games / total >= MIN_SHARE ? `one-trick:${top.championName}` : null;
}
