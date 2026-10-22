import { DEFAULT_PLATFORM, storedPlatform, type Platform } from "@/lib/game/platforms";

const STORAGE_KEY = "summon-gg-platform";
const CHANGE_EVENT = "summon-gg-platform-change";

export function readPlatformPreference(): Platform {
	if (typeof window === "undefined") return DEFAULT_PLATFORM;
	try {
		return storedPlatform(localStorage.getItem(STORAGE_KEY)) ?? DEFAULT_PLATFORM;
	} catch {
		return DEFAULT_PLATFORM;
	}
}

export function writePlatformPreference(platform: Platform): void {
	try {
		localStorage.setItem(STORAGE_KEY, platform);
		window.dispatchEvent(new Event(CHANGE_EVENT));
	} catch {
		return;
	}
}

export function subscribePlatformPreference(onChange: () => void): () => void {
	window.addEventListener("storage", onChange);
	window.addEventListener(CHANGE_EVENT, onChange);
	return () => {
		window.removeEventListener("storage", onChange);
		window.removeEventListener(CHANGE_EVENT, onChange);
	};
}
