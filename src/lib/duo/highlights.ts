type Ranked = { puuid: string; games: number; difference: number | null };

const pick = <T extends Ranked>(partners: T[], score: (p: T) => number | null): T | null =>
	partners.reduce<T | null>((best, p) => {
		const s = score(p);
		return s !== null && (best === null || s > (score(best) ?? -Infinity)) ? p : best;
	}, null);

/** The partner with the most games, the one you win most more with, and the one you win most less with. */
export function duoHighlights<T extends Ranked>(partners: T[]): { mostPlayed: T | null; best: T | null; toughest: T | null } {
	return {
		mostPlayed: pick(partners, (p) => p.games),
		best: pick(partners, (p) => (p.difference !== null && p.difference > 0 ? p.difference : null)),
		toughest: pick(partners, (p) => (p.difference !== null && p.difference < 0 ? -p.difference : null)),
	};
}
