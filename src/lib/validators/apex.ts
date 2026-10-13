import { z } from "zod";
import { RANKED_QUEUE_TYPES } from "@/lib/game/ranked-queues";

export const apexCutoffSchema = z.object({ grandmaster: z.number(), challenger: z.number() });
export type ApexCutoff = z.infer<typeof apexCutoffSchema>;

export const APEX_QUEUES = ["RANKED_SOLO_5x5", "RANKED_FLEX_SR"] as const;
export type ApexQueue = (typeof APEX_QUEUES)[number];

export const apexCacheSchema = z.partialRecord(z.enum(APEX_QUEUES), apexCutoffSchema.extend({ fetchedAt: z.number() }));
export type ApexCache = z.infer<typeof apexCacheSchema>;

export const apexCutoffsSchema = z.partialRecord(z.enum(RANKED_QUEUE_TYPES), apexCutoffSchema);
export type ApexCutoffs = z.infer<typeof apexCutoffsSchema>;
