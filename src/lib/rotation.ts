import { z } from "zod";
import { getAppSetting, setAppSetting } from "@/lib/app-settings";
import { revalidateInBackground } from "@/lib/cache-utils";
import { getChampionRotation } from "@/lib/riot/rotation";
import {
	championRotationSchema,
	legacyChampionRotationSchema,
	type FreeRotation,
} from "@/lib/validators/rotation";

export const ROTATION_SETTING_KEY = "FREE_ROTATION";
const DAY_MS = 24 * 60 * 60 * 1000;
const TUESDAY = 2;
/** After a reset Riot may swap the rotation at any hour, so the cache is re-checked this often for this long. */
const SWAP_WINDOW_MS = 36 * 60 * 60 * 1000;
const SWAP_RECHECK_MS = 6 * 60 * 60 * 1000;

/** Most recent Tuesday 00:00 UTC at or before `now`, when the weekly free rotation changes. */
export function lastRotationReset(now: Date): Date {
	const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	const daysSince = (now.getUTCDay() - TUESDAY + 7) % 7;
	return new Date(midnight - daysSince * DAY_MS);
}

const cachedRotationSchema = z.object({
	fetchedAt: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
	freeChampionIds: z.array(z.number()),
});

export type CachedRotation = z.infer<typeof cachedRotationSchema>;

/** Stored `AppSettings` value to a rotation; anything invalid counts as missing. */
export function parseCachedRotation(raw: string | null): CachedRotation | null {
	if (!raw) return null;
	try {
		const parsed = cachedRotationSchema.safeParse(JSON.parse(raw));
		return parsed.success
			? { ...parsed.data, fetchedAt: new Date(parsed.data.fetchedAt).toISOString() }
			: null;
	} catch {
		return null;
	}
}

export function serializeRotation(freeChampionIds: number[], now: Date): string {
	return JSON.stringify({ fetchedAt: now.toISOString(), freeChampionIds });
}

/** Cache freshness: valid until the next Tuesday reset, re-checked every 6h in the 36h after one; a future timestamp counts as stale. */
export function rotationCacheState(
	cached: CachedRotation | null,
	now: Date,
): "fresh" | "stale" | "missing" {
	if (!cached) return "missing";
	const fetched = Date.parse(cached.fetchedAt);
	const age = now.getTime() - fetched;
	const reset = lastRotationReset(now).getTime();
	if (age < 0 || fetched < reset) return "stale";
	if (now.getTime() - reset < SWAP_WINDOW_MS && age >= SWAP_RECHECK_MS) return "stale";
	return "fresh";
}

/** Riot rotation response (current or legacy shape) to free champion ids; throws on anything else. */
export function toFreeRotation(raw: unknown): FreeRotation {
	const current = championRotationSchema.safeParse(raw);
	if (current.success) return { freeChampionIds: current.data.sr };
	return { freeChampionIds: legacyChampionRotationSchema.parse(raw).freeChampionIds };
}

async function fetchAndStoreRotation(now: Date): Promise<FreeRotation> {
	const { freeChampionIds } = toFreeRotation(await getChampionRotation());
	await setAppSetting(ROTATION_SETTING_KEY, serializeRotation(freeChampionIds, now));
	return { freeChampionIds };
}

/** Free rotation from the `AppSettings` cache, refreshed from Riot after each weekly Tuesday reset. */
export async function getFreeRotation(now: Date = new Date()): Promise<FreeRotation> {
	const cached = parseCachedRotation(await getAppSetting(ROTATION_SETTING_KEY));
	const state = rotationCacheState(cached, now);

	if (state === "missing") return fetchAndStoreRotation(now);
	if (state === "stale") {
		revalidateInBackground(async () => {
			await fetchAndStoreRotation(now);
		});
	}
	return { freeChampionIds: cached!.freeChampionIds };
}
