const STORAGE_KEY = "summon-gg-search-history";
const CHANGE_EVENT = "summon-gg-search-history-change";
const MAX_ITEMS = 10;

/** Parses the stored history; anything that is not a JSON string array yields `[]`. */
export function parseSearchHistory(raw: string | null): string[] {
	if (!raw) return [];
	try {
		const value: unknown = JSON.parse(raw);
		return Array.isArray(value)
			? value.filter((item): item is string => typeof item === "string")
			: [];
	} catch {
		return [];
	}
}

/** Raw stored value, used as the `useSyncExternalStore` snapshot. */
export function readSearchHistoryRaw(): string | null {
	if (typeof window === "undefined") return null;
	try {
		return localStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
}

/** Subscribes to history changes from this tab and from other tabs. */
export function subscribeSearchHistory(onChange: () => void): () => void {
	window.addEventListener("storage", onChange);
	window.addEventListener(CHANGE_EVENT, onChange);
	return () => {
		window.removeEventListener("storage", onChange);
		window.removeEventListener(CHANGE_EVENT, onChange);
	};
}

/** Current history, newest first. */
export function getSearchHistory(): string[] {
	return parseSearchHistory(readSearchHistoryRaw());
}

/** Moves `query` to the front of the history, capped at `MAX_ITEMS`. */
export function addSearchHistory(query: string): void {
	if (typeof window === "undefined") return;
	try {
		const history = getSearchHistory().filter((item) => item !== query);
		history.unshift(query);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_ITEMS)));
		window.dispatchEvent(new Event(CHANGE_EVENT));
	} catch {
		return;
	}
}

/** Removes all stored history. */
export function clearSearchHistory(): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.removeItem(STORAGE_KEY);
		window.dispatchEvent(new Event(CHANGE_EVENT));
	} catch {
		return;
	}
}
