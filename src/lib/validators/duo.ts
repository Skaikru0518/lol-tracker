import { z } from "zod";
import { recentSummarySchema } from "./performance";

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

const sharedSideSchema = z.object({ championName: z.string(), kills: z.number(), deaths: z.number(), assists: z.number(), score: z.number().nullable() });

const duoSideSchema = z.object({
	puuid: z.string(),
	gameName: z.string(),
	tagLine: z.string(),
	profileIcon: z.number(),
	rank: z.object({ tier: z.string(), rank: z.string(), leaguePoints: z.number() }).nullable(),
	summary: recentSummarySchema,
});

export const duoCompareSchema = z.object({
	player: duoSideSchema,
	friend: duoSideSchema,
	shared: z.array(
		z.object({
			matchId: z.string(),
			gameCreation: z.number(),
			win: z.boolean(),
			player: sharedSideSchema,
			friend: sharedSideSchema,
			crown: z.enum(["player", "friend"]).nullable(),
		}),
	),
	together: z.object({ wins: z.number(), losses: z.number(), playerCarried: z.number(), friendCarried: z.number() }),
});

export type DuoComparePayload = z.infer<typeof duoCompareSchema>;
export type DuoSidePayload = z.infer<typeof duoSideSchema>;
