import { useMemo, useSyncExternalStore } from "react";
import {
	parseSearchHistory,
	readSearchHistoryRaw,
	subscribeSearchHistory,
} from "@/lib/search-history";

/** Search history synced with localStorage, including other tabs. */
export function useSearchHistory(): string[] {
	const raw = useSyncExternalStore(
		subscribeSearchHistory,
		readSearchHistoryRaw,
		() => null,
	);
	return useMemo(() => parseSearchHistory(raw), [raw]);
}
