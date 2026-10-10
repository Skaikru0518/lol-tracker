import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { parseSearchTerms } from "@/lib/summoner/search-query";
import { recentSearchSchema, type RecentSearch } from "@/lib/validators/recent-searches";

const DEBOUNCE_MS = 500;

/** Name suggestions for the typed text: one request per typing pause, cached per query, older requests aborted. */
export function useSummonerSuggestions(input: string) {
	const [debounced, setDebounced] = useState(input);
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(input), DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [input]);

	const terms = parseSearchTerms(debounced);
	const query = useQuery<RecentSearch[]>({
		queryKey: ["summoner-search", terms?.name.toLowerCase() ?? "", terms?.tag?.toLowerCase() ?? ""],
		queryFn: async ({ signal }) => {
			const res = await fetch(`/api/summoner-search?${new URLSearchParams({ q: debounced })}`, { signal });
			if (!res.ok) throw new Error("Summoner search failed");
			return z.array(recentSearchSchema).parse(await res.json());
		},
		enabled: terms !== null,
		staleTime: 60_000,
		placeholderData: keepPreviousData,
		retry: 1,
		refetchOnWindowFocus: false,
	});
	const typing = parseSearchTerms(input) !== null && input.trim() !== debounced.trim();
	return { results: terms ? (query.data ?? []) : [], pending: typing || query.isFetching, isError: query.isError, terms: parseSearchTerms(input) };
}
