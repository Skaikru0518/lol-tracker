import { RANK_COLORS } from "@/lib/icon-helpers";
import { formatRankLabel } from "@/lib/rank-calculator";
import { type RankedEntry } from "@/lib/validators/ranked";

/** One rank chip in the profile hero. */
export interface RankPill {
	queueType: string;
	label: string;
	color: string;
}

const QUEUE_SHORT: Record<string, string> = {
	RANKED_SOLO_5x5: "SOLO",
	RANKED_FLEX_SR: "FLEX",
};

const QUEUE_ORDER = ["RANKED_SOLO_5x5", "RANKED_FLEX_SR"];

const FALLBACK_COLOR = "#7d829c";

/** Hero rank chips for solo and flex, solo first; other queues are ignored. */
export function rankPills(entries: RankedEntry[]): RankPill[] {
	return QUEUE_ORDER.flatMap((queueType) => {
		const entry = entries.find((e) => e.queueType === queueType);
		if (!entry) return [];
		return [
			{
				queueType,
				label: `${formatRankLabel(entry.tier, entry.rank).toUpperCase()} · ${QUEUE_SHORT[queueType]}`,
				color: RANK_COLORS[entry.tier] ?? FALLBACK_COLOR,
			},
		];
	});
}
