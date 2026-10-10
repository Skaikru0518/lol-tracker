/** Exact-name matches first, then prefix matches not already listed, capped at `limit`. */
export function mergeExactFirst<T extends { puuid: string }>(exact: T[], prefix: T[], limit: number): T[] {
	const seen = new Set(exact.map((r) => r.puuid));
	return [...exact, ...prefix.filter((r) => !seen.has(r.puuid))].slice(0, limit);
}

export type SuggestionStatus = "results" | "pending" | "error" | "empty";

/** What the suggestion dropdown shows: rows when there are any, else a searching, error or no-match line. */
export function suggestionStatus({
	pending,
	isError,
	resultCount,
	hasLookup,
}: {
	pending: boolean;
	isError: boolean;
	resultCount: number;
	hasLookup: boolean;
}): SuggestionStatus {
	if (resultCount > 0 || hasLookup) return "results";
	if (pending) return "pending";
	if (isError) return "error";
	return "empty";
}
