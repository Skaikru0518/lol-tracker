import { z } from "zod";
import { platformSchema } from "./platform";

export const recentSearchSchema = z.object({
	puuid: z.string(),
	gameName: z.string(),
	tagLine: z.string(),
	platform: platformSchema,
	profileIconId: z.number().nullable(),
	soloTier: z.string().nullable(),
	soloRank: z.string().nullable(),
	soloLp: z.number().nullable(),
});

export type RecentSearch = z.infer<typeof recentSearchSchema>;
