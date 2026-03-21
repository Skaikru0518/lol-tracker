import { z } from "zod";

export const liveGameParticipantSchema = z.object({
	puuid: z.string(),
	summonerId: z.string(),
	riotId: z.string(),
	championId: z.number(),
	teamId: z.number(),
	spell1Id: z.number(),
	spell2Id: z.number(),
	perks: z.object({
		perkIds: z.array(z.number()),
		perkStyle: z.number(),
		perkSubStyle: z.number(),
	}),
});

export const liveGameSchema = z.object({
	gameId: z.number(),
	gameMode: z.string(),
	gameType: z.string(),
	gameLength: z.number(),
	mapId: z.number(),
	participants: z.array(liveGameParticipantSchema),
	gameQueueConfigId: z.number(),
});

export type LiveGameParticipant = z.infer<typeof liveGameParticipantSchema>;
export type LiveGame = z.infer<typeof liveGameSchema>;
