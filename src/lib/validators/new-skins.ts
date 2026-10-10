import { z } from "zod";

export const newSkinSchema = z.object({
	id: z.number(),
	name: z.string(),
	rarity: z.string(),
	splash: z.string(),
});

export const newSkinsSchema = z.object({
	patch: z.string(),
	skins: z.array(newSkinSchema),
});

/** Raw CommunityDragon `skins.json` entry, only the fields we read. */
export const rawSkinSchema = z.object({
	id: z.number(),
	name: z.string(),
	isBase: z.boolean(),
	rarity: z.string(),
	splashPath: z.string(),
});

export type NewSkin = z.infer<typeof newSkinSchema>;
export type NewSkins = z.infer<typeof newSkinsSchema>;
export type RawSkin = z.infer<typeof rawSkinSchema>;
