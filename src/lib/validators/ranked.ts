import { z } from "zod";

export const rankedEntrySchema = z.object({
	leagueId: z.string(),
	summonerId: z.string(),
	queueType: z.string(),
	tier: z.string(),
	rank: z.string(),
	leaguePoints: z.number(),
	wins: z.number(),
	losses: z.number(),
	hotStreak: z.boolean(),
	veteran: z.boolean(),
	freshBlood: z.boolean(),
	inactive: z.boolean(),
});

export type RankedEntry = z.infer<typeof rankedEntrySchema>;
