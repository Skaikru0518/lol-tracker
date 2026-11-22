import { z } from "zod";

export const duoPartnerSchema = z.object({
	puuid: z.string(),
	gameName: z.string(),
	tagLine: z.string(),
	profileIcon: z.number(),
	games: z.number(),
	wins: z.number(),
	winRate: z.number(),
	difference: z.number().nullable(),
	role: z.string().nullable(),
});

export const duoPartnersSchema = z.array(duoPartnerSchema);
export type DuoPartnerPayload = z.infer<typeof duoPartnerSchema>;
