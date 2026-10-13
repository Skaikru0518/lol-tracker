import { lowestLp, refreshCutoffs, toCutoffs, type CutoffAttempts } from "@/lib/game/apex-cutoffs";
import { getApexLeague } from "@/lib/riot/apex";
import { getAppSetting, setAppSetting } from "@/lib/server/app-settings";
import { revalidateInBackground } from "@/lib/server/cache-utils";
import { apexCacheSchema, type ApexCache, type ApexCutoffs } from "@/lib/validators/apex";

const KEY = "apex-cutoffs";

let attempts: CutoffAttempts = {};
let inFlight: Promise<ApexCutoffs> | null = null;

async function readCache(): Promise<ApexCache> {
	const raw = await getAppSetting(KEY);
	if (!raw) return {};
	const parsed = apexCacheSchema.safeParse(JSON.parse(raw));
	return parsed.success ? parsed.data : {};
}

async function refresh(force: boolean): Promise<ApexCutoffs> {
	const result = await refreshCutoffs(await readCache(), attempts, async (tier, queue) => lowestLp((await getApexLeague(tier, queue)).entries), Date.now(), { force });
	attempts = result.attempts;
	if (result.changed) await setAppSetting(KEY, JSON.stringify(result.cache));
	return toCutoffs(result.cache);
}

// Profile loads ask for both routes at once, so concurrent refreshes share one Riot round
export function apexCutoffs(): Promise<ApexCutoffs> {
	inFlight ??= refresh(false).finally(() => {
		inFlight = null;
	});
	return inFlight;
}

// Riot re-sorts Master+ once a day at the ladder update; the cron calls this right after it
export async function forceRefreshApexCutoffs(): Promise<ApexCutoffs> {
	await inFlight?.catch(() => undefined);
	return refresh(true);
}

export async function cachedApexCutoffs(): Promise<ApexCutoffs> {
	revalidateInBackground(async () => {
		await apexCutoffs();
	});
	return toCutoffs(await readCache());
}
