import { z } from "zod";
import { RANKED_QUEUE_TYPES } from "@/lib/game/ranked-queues";

export const mmrEstimateSchema = z.object({
	queueType: z.enum(RANKED_QUEUE_TYPES),
	tier: z.string(),
	rank: z.string(),
	absolute: z.number(),
	direction: z.enum(["above", "below", "equal"]),
	lpGames: z.number(),
	winGain: z.number().nullable(),
	lossLoss: z.number().nullable(),
	lobbyPlayers: z.number(),
});
export type MmrEstimate = z.infer<typeof mmrEstimateSchema>;

export const mmrEstimatesSchema = z.object({ estimates: z.array(mmrEstimateSchema) });
export type MmrEstimates = z.infer<typeof mmrEstimatesSchema>;
