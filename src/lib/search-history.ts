const STORAGE_KEY = "lol-tracker-search-history";
const MAX_ITEMS = 5;

export function getSearchHistory(): string[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		return JSON.parse(raw) as string[];
	} catch {
		return [];
	}
}

export function addSearchHistory(query: string): void {
	if (typeof window === "undefined") return;
	try {
		const history = getSearchHistory().filter((item) => item !== query);
		history.unshift(query);
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify(history.slice(0, MAX_ITEMS)),
		);
	} catch {
		// ignore storage errors
	}
}

export function clearSearchHistory(): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {
		// ignore storage errors
	}
}
