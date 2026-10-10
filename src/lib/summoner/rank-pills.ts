import { RANK_COLORS } from "@/lib/icon-helpers";
import { formatRankLabel } from "@/lib/rank-calculator";
import { RANKED_QUEUE_SHORT, RANKED_QUEUE_TYPES } from "@/lib/ranked-queues";
import { type RankedEntry } from "@/lib/validators/ranked";

/** One rank chip in the profile hero. */
export interface RankPill {
	queueType: string;
	label: string;
	color: string;
}

const FALLBACK_COLOR = "#7d829c";

/** Hero rank chips for solo, flex and 5s in that order; other queues are ignored. */
export function rankPills(entries: RankedEntry[]): RankPill[] {
	return RANKED_QUEUE_TYPES.flatMap((queueType) => {
		const entry = entries.find((e) => e.queueType === queueType);
		if (!entry) return [];
		return [
			{
				queueType,
				label: `${formatRankLabel(entry.tier, entry.rank).toUpperCase()} · ${RANKED_QUEUE_SHORT[queueType]}`,
				color: RANK_COLORS[entry.tier] ?? FALLBACK_COLOR,
			},
		];
	});
}
