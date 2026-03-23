import { z } from "zod";

export const rankedEntrySchema = z.object({
	id: z.string().optional(),
	leagueId: z.string().optional(),
	summonerId: z.string().optional(),
	puuid: z.string().optional(),
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
	updatedAt: z.coerce.date().optional(),
});

export type RankedEntry = z.infer<typeof rankedEntrySchema>;
