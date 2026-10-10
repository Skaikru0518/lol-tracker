export type QueueFilter = "all" | "solo" | "flex" | "aram" | "normal";

export const QUEUE_FILTERS: readonly QueueFilter[] = ["all", "solo", "flex", "aram", "normal"];

/** Which queue ids a filter keeps (`include`) or drops (`exclude`). */
export interface QueueSelection {
	mode: "include" | "exclude";
	ids: number[];
}

const SELECTIONS: Record<QueueFilter, QueueSelection> = {
	all: { mode: "exclude", ids: [1700, 1710] },
	solo: { mode: "include", ids: [420] },
	flex: { mode: "include", ids: [440] },
	aram: { mode: "include", ids: [450] },
	normal: { mode: "include", ids: [400, 430, 480, 490] },
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
