import { z } from "zod";
import { getAppSetting, setAppSetting } from "@/lib/server/app-settings";
import { revalidateInBackground } from "@/lib/server/cache-utils";
import { CDRAGON, cachedSkinsSchema, type CachedSkins, GAME_DATA, newSkinsBetween, patchOf, previousPatch, skinsCacheState } from "@/lib/home/new-skins";
import { type NewSkins, rawSkinSchema } from "@/lib/validators/new-skins";

const SETTING_KEY = "NEW_SKINS";

async function fetchJson(url: string): Promise<unknown> {
	// skins.json is ~6MB, above the Next data cache limit; the AppSettings row is the cache
	const res = await fetch(url, { cache: "no-store" });
	if (!res.ok) throw new Error(`CommunityDragon ${res.status} for ${url}`);
	return res.json();
}

const rawSkinsSchema = z.record(z.string(), rawSkinSchema);

async function fetchAndStore(now: Date): Promise<NewSkins> {
	const meta = z.object({ version: z.string() }).parse(await fetchJson(`${CDRAGON}/latest/content-metadata.json`));
	const patch = patchOf(meta.version);
	const before = previousPatch(patch);
	const current = rawSkinsSchema.parse(await fetchJson(`${CDRAGON}/latest/${GAME_DATA}/v1/skins.json`));
	const previous = before ? rawSkinsSchema.parse(await fetchJson(`${CDRAGON}/${before}/${GAME_DATA}/v1/skins.json`)) : current;
	const result = { patch, skins: newSkinsBetween(current, previous) };
	await setAppSetting(SETTING_KEY, JSON.stringify({ ...result, fetchedAt: now.toISOString() }));
	return result;
}

function parseCached(raw: string | null): CachedSkins | null {
	if (!raw) return null;
	try {
		const parsed = cachedSkinsSchema.safeParse(JSON.parse(raw));
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

/** Skins added this patch from the `AppSettings` cache (7 days), refreshed from CommunityDragon in the background when stale. */
export async function getNewSkins(now: Date = new Date()): Promise<NewSkins> {
	const cached = parseCached(await getAppSetting(SETTING_KEY));
	const state = skinsCacheState(cached, now);
	if (state === "missing") return fetchAndStore(now);
	if (state === "stale") revalidateInBackground(async () => void (await fetchAndStore(now)));
	return { patch: cached!.patch, skins: cached!.skins };
}
