export const PLATFORMS = {
	eune: { host: "eun1", label: "EUNE" },
	euw: { host: "euw1", label: "EUW" },
} as const;

export type Platform = keyof typeof PLATFORMS;

export const DEFAULT_PLATFORM: Platform = "eune";
export const PLATFORM_LIST = Object.keys(PLATFORMS) as Platform[];

export function isPlatform(value: unknown): value is Platform {
	return typeof value === "string" && Object.hasOwn(PLATFORMS, value);
}

export function platformUrl(platform: Platform): string {
	return `https://${PLATFORMS[platform].host}.api.riotgames.com`;
}

export function platformFromRiotRegion(region: string | null | undefined): Platform | null {
	const host = region?.toLowerCase();
	return PLATFORM_LIST.find((p) => PLATFORMS[p].host === host) ?? null;
}

export function storedPlatform(value: string | null | undefined): Platform | null {
	return isPlatform(value) ? value : null;
}
