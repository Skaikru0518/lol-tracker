import { z } from "zod";

export const championMasterySchema = z.object({
	id: z.string().optional(),
	puuid: z.string(),
	championId: z.number(),
	championLevel: z.number(),
	championPoints: z.number(),
	lastPlayTime: z.number(),
	championPointsSinceLastLevel: z.number(),
	championPointsUntilNextLevel: z.number(),
	updatedAt: z.coerce.date().optional(),
});

export type ChampionMastery = z.infer<typeof championMasterySchema>;
