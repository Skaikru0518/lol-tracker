export interface Season {
	id: string;
	label: string;
	start: string;
}

/** Riot ranked years, oldest first; a new reset is one more line. */
export const SEASONS: Season[] = [
	{ id: "2025", label: "Season 2025", start: "2025-01-09T11:00:00Z" },
	{ id: "2026", label: "Season 2026", start: "2026-01-08T11:00:00Z" },
];

/** A season runs until the next one starts; the last one is open-ended. */
export function seasonRange(season: Season): { from: Date; to: Date | null } {
	const next = SEASONS[SEASONS.findIndex((s) => s.id === season.id) + 1];
	return { from: new Date(season.start), to: next ? new Date(next.start) : null };
}

/** The season `date` falls in; null before the first one. */
export function seasonFor(date: Date): Season | null {
	return [...SEASONS].reverse().find((s) => new Date(s.start) <= date) ?? null;
}

/** The latest season that has started (the first one before any has). */
export function currentSeason(now: Date = new Date()): Season {
	return seasonFor(now) ?? SEASONS[0];
}
