import { lowestLp, refreshCutoffs, toCutoffs } from "@/lib/game/apex-cutoffs";
import { getApexLeague } from "@/lib/riot/apex";
import { getAppSetting, setAppSetting } from "@/lib/server/app-settings";
import { apexCacheSchema, type ApexCache, type ApexCutoffs } from "@/lib/validators/apex";

const KEY = "apex-cutoffs";

async function readCache(): Promise<ApexCache> {
	const raw = await getAppSetting(KEY);
	if (!raw) return {};
	const parsed = apexCacheSchema.safeParse(JSON.parse(raw));
	return parsed.success ? parsed.data : {};
}

export async function apexCutoffs(): Promise<ApexCutoffs> {
	const { cache, changed } = await refreshCutoffs(await readCache(), async (tier, queue) => lowestLp((await getApexLeague(tier, queue)).entries), Date.now());
	if (changed) await setAppSetting(KEY, JSON.stringify(cache));
	return toCutoffs(cache);
}
