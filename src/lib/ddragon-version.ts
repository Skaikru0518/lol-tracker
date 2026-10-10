/** Version used when DDragon cannot be reached and none was remembered; old versions stay served. */
export const FALLBACK_DDRAGON_VERSION = "16.20.1";

const STORAGE_KEY = "ddragon-version";

export interface VersionStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

function safely<T>(fn: () => T): T | null {
	try {
		return fn();
	} catch {
		return null;
	}
}

/** Latest DDragon version; when that request fails, the last remembered one, else the fallback. Never rejects. */
export async function resolveDDragonVersion(fetchLatest: () => Promise<string>, storage: VersionStorage | null): Promise<string> {
	try {
		const version = await fetchLatest();
		safely(() => storage?.setItem(STORAGE_KEY, version));
		return version;
	} catch {
		return safely(() => storage?.getItem(STORAGE_KEY)) ?? FALLBACK_DDRAGON_VERSION;
	}
}
