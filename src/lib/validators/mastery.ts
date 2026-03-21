import { z } from "zod";

export const championMasterySchema = z.object({
	puuid: z.string(),
	championId: z.number(),
	championLevel: z.number(),
	championPoints: z.number(),
	lastPlayTime: z.number(),
	championPointsSinceLastLevel: z.number(),
	championPointsUntilNextLevel: z.number(),
});

export type ChampionMastery = z.infer<typeof championMasterySchema>;
