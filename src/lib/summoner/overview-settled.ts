/** True once the overview's Riot pages are done: the second page fetched, or the first failed so the second never runs. */
export function overviewSettled(first: { isError: boolean }, rest: { isFetched: boolean }): boolean {
	return first.isError || rest.isFetched;
}
