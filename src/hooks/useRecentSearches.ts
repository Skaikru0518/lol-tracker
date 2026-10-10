import { useQuery } from "@tanstack/react-query";
import { type RecentSearch } from "@/lib/validators/recent-searches";

async function fetchRecentSearches(): Promise<RecentSearch[]> {
	const res = await fetch("/api/recent-searches");
	if (!res.ok) throw new Error("Failed to fetch recent searches");
	return res.json();
}

/** Server-wide recently looked-up summoners for the home page. */
export function useRecentSearches() {
	return useQuery<RecentSearch[]>({
		queryKey: ["recent-searches"],
		queryFn: fetchRecentSearches,
		staleTime: 1000 * 60,
	});
}
