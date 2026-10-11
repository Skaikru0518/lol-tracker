import { z } from "zod";

export const rarityStoreSchema = z.object({
	computedAt: z.string(),
	players: z.number(),
	shares: z.record(z.string(), z.array(z.number())),
});

export const raritySchema = rarityStoreSchema.omit({ computedAt: true });

export const progressRowSchema = z.object({
	achievementId: z.string(),
	scope: z.string(),
	value: z.number(),
	tier: z.number(),
	reachedAt: z.array(z.string()),
});

export const achievementPayloadSchema = z.object({
	form: z.array(z.object({ achievementId: z.string(), earnedAt: z.string() })),
	progress: z.array(progressRowSchema),
	rarity: raritySchema.nullable(),
});

export type ProgressRow = z.infer<typeof progressRowSchema>;
export type Rarity = z.infer<typeof raritySchema>;
export type AchievementPayload = z.infer<typeof achievementPayloadSchema>;
