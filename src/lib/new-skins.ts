import { z } from "zod";
import { newSkinSchema, type NewSkin, type RawSkin } from "@/lib/validators/new-skins";

export const CDRAGON = "https://raw.communitydragon.org";
export const GAME_DATA = "plugins/rcp-be-lol-game-data/global/default";
const ASSET_PREFIX = "/lol-game-data/assets/";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
// Mode variants (Swarm, TFT) live in the eight-digit id range
const MAX_SKIN_ID = 10_000_000;

/** `16.20` from a CommunityDragon content version like `16.20.8248524+branch…`. */
export function patchOf(version: string): string {
	return version.split(".").slice(0, 2).join(".");
}

/** The patch before `patch`; null for the first patch of a season, which has no comparable predecessor. */
export function previousPatch(patch: string): string | null {
	const [major, minor] = patch.split(".").map(Number);
	return minor > 1 ? `${major}.${minor - 1}` : null;
}

/** A `/lol-game-data/assets/…` path as its raw CommunityDragon URL (paths are served lower-cased). */
export function cdragonAsset(path: string): string {
	return `${CDRAGON}/latest/${GAME_DATA}/${path.replace(ASSET_PREFIX, "").toLowerCase()}`;
}

/** Skins in `current` that `previous` lacks: no base skins, no mode variants, ordered by id. */
export function newSkinsBetween(current: Record<string, RawSkin>, previous: Record<string, RawSkin>): NewSkin[] {
	return Object.values(current)
		.filter((s) => !s.isBase && s.id < MAX_SKIN_ID && !(String(s.id) in previous))
		.sort((a, b) => a.id - b.id)
		.map((s) => ({ id: s.id, name: s.name, rarity: s.rarity, splash: cdragonAsset(s.splashPath) }));
}

/** `kEpic` → `Epic`; null for skins without a rarity. */
export function rarityLabel(rarity: string): string | null {
	const label = rarity.replace(/^k/, "");
	return label === "NoRarity" ? null : label;
}

export const cachedSkinsSchema = z.object({ patch: z.string(), fetchedAt: z.string(), skins: z.array(newSkinSchema) });
export type CachedSkins = z.infer<typeof cachedSkinsSchema>;

/** Seven-day freshness of the stored list; a future timestamp counts as stale. */
export function skinsCacheState(cached: CachedSkins | null, now: Date): "fresh" | "stale" | "missing" {
	if (!cached) return "missing";
	const age = now.getTime() - Date.parse(cached.fetchedAt);
	return age >= 0 && age < MAX_AGE_MS ? "fresh" : "stale";
}
