import { ARENA_QUEUE_IDS } from "@/lib/game/arena-helpers";

export type QueueFilter = "all" | "solo" | "flex" | "premade" | "normal" | "aram" | "mayhem" | "arena" | "event";

export const QUEUE_FILTERS: readonly QueueFilter[] = ["all", "solo", "flex", "premade", "normal", "aram", "mayhem", "arena", "event"];

/** Summoner's Rift queues where roles mean something: normals, ranked and Clash. */
export const RIFT_QUEUE_IDS = [400, 420, 430, 440, 480, 490, 700, 710];

/** Which queue ids a filter keeps (`include`) or drops (`exclude`). */
export interface QueueSelection {
	mode: "include" | "exclude";
	ids: number[];
}

const SELECTIONS: Record<QueueFilter, QueueSelection> = {
	all: { mode: "exclude", ids: ARENA_QUEUE_IDS },
	solo: { mode: "include", ids: [420] },
	flex: { mode: "include", ids: [440] },
	premade: { mode: "include", ids: [710] },
	normal: { mode: "include", ids: [400, 430, 480, 490] },
	aram: { mode: "include", ids: [450, 720] },
	mayhem: { mode: "include", ids: [2400] },
	arena: { mode: "include", ids: ARENA_QUEUE_IDS },
	event: { mode: "include", ids: [900, 1010, 1020, 1300, 1400, 1900, 2300] },
};

/** `?queue=` value to a filter; missing means `all`, unknown values return `null`. */
export function parseQueueFilter(value: string | null): QueueFilter | null {
	if (value === null) return "all";
	return (QUEUE_FILTERS as readonly string[]).includes(value) ? (value as QueueFilter) : null;
}

/** Queue ids behind a filter. */
export function queueSelection(filter: QueueFilter): QueueSelection {
	return SELECTIONS[filter];
}
