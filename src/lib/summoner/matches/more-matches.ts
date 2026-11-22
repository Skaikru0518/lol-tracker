export const MORE_MATCHES_PAGE = 50;

/** Riot offset of the next "load more" page; undefined once a page comes back empty. */
export function nextMatchStart(lastPageSize: number, lastStart: number): number | undefined {
	return lastPageSize > 0 ? lastStart + MORE_MATCHES_PAGE : undefined;
}

/** First 50 plus the older pages without repeats: a game finished since the first load shifts every offset by one. */
export function mergeMatchPages<T extends { metadata: { matchId: string } }>(first: T[], more: T[]): T[] {
	return [...new Map([...first, ...more].map((m) => [m.metadata.matchId, m])).values()];
}
