import { platformFromRiotRegion, type Platform } from "@/lib/game/platforms";

export interface LocateDeps<S> {
	trySummoner: (platform: Platform) => Promise<S | null>;
	activeRegion: () => Promise<string | null>;
}

// Hint (search picker) first, then the stored platform, and only then Riot's active region
export async function locatePlatform<S>(
	{ hint, stored }: { hint?: Platform | null; stored?: Platform | null },
	{ trySummoner, activeRegion }: LocateDeps<S>,
): Promise<{ platform: Platform; summoner: S } | null> {
	const tried = new Set<Platform>();
	const attempt = async (platform: Platform | null | undefined) => {
		if (!platform || tried.has(platform)) return null;
		tried.add(platform);
		const summoner = await trySummoner(platform);
		return summoner ? { platform, summoner } : null;
	};
	return (await attempt(hint)) ?? (await attempt(stored)) ?? (await attempt(platformFromRiotRegion(await activeRegion())));
}
