import { z } from "zod";

/** Current champion-v3 response. */
export const championRotationSchema = z.object({
	sr: z.array(z.number()),
	newplayer: z.array(z.number()),
});

/** Pre-2026 champion-v3 response, still accepted in case Riot serves it. */
export const legacyChampionRotationSchema = z.object({
	freeChampionIds: z.array(z.number()),
	freeChampionIdsForNewPlayers: z.array(z.number()),
	maxNewPlayerLevel: z.number(),
});

export const freeRotationSchema = z.object({
	freeChampionIds: z.array(z.number()),
});

export type ChampionRotation = z.infer<typeof championRotationSchema>;
export type FreeRotation = z.infer<typeof freeRotationSchema>;
