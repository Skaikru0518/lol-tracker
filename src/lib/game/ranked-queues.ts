import { type LPSnapshot } from "@/lib/validators/lp-history";

export const RANKED_QUEUE_TYPES = ["RANKED_SOLO_5x5", "RANKED_FLEX_SR", "RANKED_PREMADE_5x5"] as const;

export type RankedQueueType = (typeof RANKED_QUEUE_TYPES)[number];

/** LP snapshots per ranked queue. */
export type LpHistories = Partial<Record<RankedQueueType, LPSnapshot[]>>;

export const RANKED_QUEUE_TITLES: Record<RankedQueueType, string> = {
	RANKED_SOLO_5x5: "Ranked Solo",
	RANKED_FLEX_SR: "Ranked Flex",
	RANKED_PREMADE_5x5: "Ranked 5s",
};

export const RANKED_QUEUE_SHORT: Record<RankedQueueType, string> = {
	RANKED_SOLO_5x5: "SOLO",
	RANKED_FLEX_SR: "FLEX",
	RANKED_PREMADE_5x5: "5S",
};

const BY_QUEUE_ID: Record<number, RankedQueueType> = {
	420: "RANKED_SOLO_5x5",
	440: "RANKED_FLEX_SR",
	710: "RANKED_PREMADE_5x5",
};

/** Ranked queue whose LP a match's queue id moves; null for unranked queues. */
export function rankedQueueForQueueId(queueId: number): RankedQueueType | null {
	return BY_QUEUE_ID[queueId] ?? null;
}
