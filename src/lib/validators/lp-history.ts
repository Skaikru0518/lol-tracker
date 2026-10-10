import { z } from "zod";

export const lpSnapshotSchema = z.object({
	id: z.string(),
	tier: z.string(),
	rank: z.string(),
	lp: z.number(),
	wins: z.number().nullable(),
	losses: z.number().nullable(),
	createdAt: z.string(),
});

export type LPSnapshot = z.infer<typeof lpSnapshotSchema>;
