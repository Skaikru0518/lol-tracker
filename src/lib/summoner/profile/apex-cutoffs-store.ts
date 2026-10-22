import { type Platform } from "@/lib/game/platforms";
import { apexCacheKey, lowestLp, refreshCutoffs, toCutoffs, type CutoffAttempts } from "@/lib/game/apex-cutoffs";
import { getApexLeague } from "@/lib/riot/apex";
import { getAppSetting, setAppSetting } from "@/lib/server/app-settings";
import { revalidateInBackground } from "@/lib/server/cache-utils";
import { apexCacheSchema, type ApexCache, type ApexCutoffs } from "@/lib/validators/apex";

const attempts = new Map<Platform, CutoffAttempts>();
const inFlight = new Map<Platform, Promise<ApexCutoffs>>();

async function readCache(platform: Platform): Promise<ApexCache> {
	const raw = await getAppSetting(apexCacheKey(platform));
	if (!raw) return {};
	const parsed = apexCacheSchema.safeParse(JSON.parse(raw));
	return parsed.success ? parsed.data : {};
}

async function refresh(platform: Platform, force: boolean): Promise<ApexCutoffs> {
	const result = await refreshCutoffs(
		await readCache(platform),
		attempts.get(platform) ?? {},
		async (tier, queue) => lowestLp((await getApexLeague(platform, tier, queue)).entries),
		Date.now(),
		{ force },
	);
	attempts.set(platform, result.attempts);
	if (result.changed) await setAppSetting(apexCacheKey(platform), JSON.stringify(result.cache));
	return toCutoffs(result.cache);
}

// Profile loads ask for both routes at once, so concurrent refreshes share one Riot round
export function apexCutoffs(platform: Platform): Promise<ApexCutoffs> {
	let pending = inFlight.get(platform);
	if (!pending) {
		pending = refresh(platform, false).finally(() => inFlight.delete(platform));
		inFlight.set(platform, pending);
	}
	return pending;
}

// Riot re-sorts Master+ once a day at the ladder update; the cron calls this right after it
export async function forceRefreshApexCutoffs(platform: Platform): Promise<ApexCutoffs> {
	await inFlight.get(platform)?.catch(() => undefined);
	return refresh(platform, true);
}

export async function cachedApexCutoffs(platform: Platform): Promise<ApexCutoffs> {
	revalidateInBackground(async () => {
		await apexCutoffs(platform);
	});
	return toCutoffs(await readCache(platform));
}
