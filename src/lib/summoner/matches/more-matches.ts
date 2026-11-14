export const MORE_MATCHES_PAGE = 50;

/** Riot offset of the next "load more" page; undefined once a page comes back empty. */
export function nextMatchStart(lastPageSize: number, lastStart: number): number | undefined {
	return lastPageSize > 0 ? lastStart + MORE_MATCHES_PAGE : undefined;
}
