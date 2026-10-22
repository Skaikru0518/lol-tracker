import { DEFAULT_PLATFORM, isPlatform, type Platform } from "@/lib/game/platforms";

const STORAGE_KEY = "summon-gg-search-history";
const CHANGE_EVENT = "summon-gg-search-history-change";
const MAX_ITEMS = 10;

export interface SearchHistoryEntry {
	riotId: string;
	platform: Platform;
}

// Entries saved before EUW support are plain "Name#TAG" strings, all from EUNE
function toEntry(item: unknown): SearchHistoryEntry | null {
	if (typeof item === "string") return { riotId: item, platform: DEFAULT_PLATFORM };
	if (typeof item !== "object" || item === null) return null;
	const { riotId, platform } = item as Record<string, unknown>;
	return typeof riotId === "string" && isPlatform(platform) ? { riotId, platform } : null;
}

/** Parses the stored history; anything that is not a JSON array yields `[]`. */
export function parseSearchHistory(raw: string | null): SearchHistoryEntry[] {
	if (!raw) return [];
	try {
		const value: unknown = JSON.parse(raw);
		return Array.isArray(value) ? value.map(toEntry).filter((entry) => entry !== null) : [];
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
export function getSearchHistory(): SearchHistoryEntry[] {
	return parseSearchHistory(readSearchHistoryRaw());
}

/** Moves `entry` to the front of the history, capped at `MAX_ITEMS`. */
export function addSearchHistory(entry: SearchHistoryEntry): void {
	if (typeof window === "undefined") return;
	try {
		const history = getSearchHistory().filter((item) => item.riotId !== entry.riotId);
		history.unshift(entry);
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
