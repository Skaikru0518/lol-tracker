import { z } from "zod";
import { platformSchema } from "./platform";

export const overlaySectionSchema = z.enum(["rank", "mains", "today"]);
export const overlayTagSchema = z.enum(["on-fire", "one-trick"]);

export const overlayPlayerSchema = z.object({
	puuid: z.string(),
	gameName: z.string(),
	tagLine: z.string(),
	teamId: z.number(),
	championId: z.number(),
	isSelf: z.boolean(),
	rank: z
		.object({
			queueType: z.string(),
			tier: z.string(),
			division: z.string(),
			leaguePoints: z.number(),
			wins: z.number(),
			losses: z.number(),
		})
		.nullable(),
	mains: z.array(z.number()).max(3),
	today: z.object({ wins: z.number(), losses: z.number(), partial: z.boolean() }).nullable(),
	tags: z.array(overlayTagSchema),
	unavailable: z.array(overlaySectionSchema),
});

export const overlayGameSchema = z.object({
	inGame: z.literal(true),
	gameId: z.number(),
	queueId: z.number(),
	platform: platformSchema,
	gameStartTime: z.number(),
	players: z.array(overlayPlayerSchema),
});

export const overlayResponseSchema = z.union([overlayGameSchema, z.object({ inGame: z.literal(false) })]);

export const overlayQuerySchema = z.object({
	gameName: z.string().min(1),
	tagLine: z.string().min(1),
	platform: platformSchema,
	since: z.coerce.number().int().nonnegative(),
});

export type OverlaySection = z.infer<typeof overlaySectionSchema>;
export type OverlayTag = z.infer<typeof overlayTagSchema>;
export type OverlayPlayer = z.infer<typeof overlayPlayerSchema>;
export type OverlayGame = z.infer<typeof overlayGameSchema>;
export type OverlayResponse = z.infer<typeof overlayResponseSchema>;
export type OverlayQuery = z.infer<typeof overlayQuerySchema>;
