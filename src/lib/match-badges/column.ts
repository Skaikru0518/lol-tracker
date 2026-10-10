const SLOTS = 3;

/** Badges for a three-row column: all of them when they fit, else the first two plus the rest behind a `+N` chip. */
export function badgeColumn(badgeIds: string[]): { shown: string[]; overflow: string[] } {
	if (badgeIds.length <= SLOTS) return { shown: badgeIds, overflow: [] };
	return { shown: badgeIds.slice(0, SLOTS - 1), overflow: badgeIds.slice(SLOTS - 1) };
}
