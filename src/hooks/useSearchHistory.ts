import { useMemo, useSyncExternalStore } from "react";
import {
	parseSearchHistory,
	readSearchHistoryRaw,
	subscribeSearchHistory,
	type SearchHistoryEntry,
} from "@/lib/home/search-history";

/** Search history synced with localStorage, including other tabs. */
export function useSearchHistory(): SearchHistoryEntry[] {
	const raw = useSyncExternalStore(
		subscribeSearchHistory,
		readSearchHistoryRaw,
		() => null,
	);
	return useMemo(() => parseSearchHistory(raw), [raw]);
}
