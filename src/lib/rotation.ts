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
export const ROTATION_MAX_AGE_MS = 6 * 60 * 60 * 1000;

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

/** Cache freshness; a future timestamp counts as stale. */
export function rotationCacheState(
	cached: CachedRotation | null,
	now: Date,
): "fresh" | "stale" | "missing" {
	if (!cached) return "missing";
	const age = now.getTime() - Date.parse(cached.fetchedAt);
	return age >= 0 && age < ROTATION_MAX_AGE_MS ? "fresh" : "stale";
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

/** Free rotation from the `AppSettings` cache, refreshed from Riot when older than 6h. */
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
