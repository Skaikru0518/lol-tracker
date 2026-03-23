import { z } from "zod";

export const accountSchema = z.object({
	puuid: z.string(),
	gameName: z.string(),
	tagLine: z.string(),
	updatedAt: z.coerce.date().optional(),
});

export const summonerSchema = z.object({
	puuid: z.string(),
	profileIconId: z.number(),
	summonerLevel: z.number(),
	revisionDate: z.number(),
	updatedAt: z.coerce.date().optional(),
});

export type Account = z.infer<typeof accountSchema>;
export type Summoner = z.infer<typeof summonerSchema>;
