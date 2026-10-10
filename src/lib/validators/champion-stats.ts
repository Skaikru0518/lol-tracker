import { z } from "zod";

export const championStatSchema = z.object({
	championId: z.number(),
	championName: z.string(),
	games: z.number(),
	wins: z.number(),
	winRate: z.number(),
	kills: z.number(),
	deaths: z.number(),
	assists: z.number(),
	kda: z.number(),
	csPerMin: z.number(),
	avgDamage: z.number(),
});

export type ChampionStat = z.infer<typeof championStatSchema>;
