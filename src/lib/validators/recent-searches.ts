import { z } from "zod";

export const recentSearchSchema = z.object({
	puuid: z.string(),
	gameName: z.string(),
	tagLine: z.string(),
	profileIconId: z.number().nullable(),
	soloTier: z.string().nullable(),
	soloRank: z.string().nullable(),
	soloLp: z.number().nullable(),
});

export type RecentSearch = z.infer<typeof recentSearchSchema>;
