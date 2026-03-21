import { z } from "zod";

export const participantFrameSchema = z.object({
	participantId: z.number(),
	totalGold: z.number(),
	level: z.number(),
	minionsKilled: z.number(),
	xp: z.number(),
});

export const timelineEventSchema = z.object({
	type: z.string(),
	timestamp: z.number(),
	killerId: z.number().optional(),
	victimId: z.number().optional(),
	killerTeamId: z.number().optional(),
	teamId: z.number().optional(),
	monsterType: z.string().optional(),
	buildingType: z.string().optional(),
	towerType: z.string().optional(),
	laneType: z.string().optional(),
	bounty: z.number().optional(),
});

export const frameSchema = z.object({
	timestamp: z.number(),
	participantFrames: z.record(z.string(), participantFrameSchema),
	events: z.array(timelineEventSchema),
});

export const timelineSchema = z.object({
	metadata: z.object({
		matchId: z.string(),
	}),
	info: z.object({
		frameInterval: z.number(),
		frames: z.array(frameSchema),
	}),
});

export type ParticipantFrame = z.infer<typeof participantFrameSchema>;
export type TimelineEvent = z.infer<typeof timelineEventSchema>;
export type Frame = z.infer<typeof frameSchema>;
export type Timeline = z.infer<typeof timelineSchema>;
