import { RankEmblem } from "@/components/ui/rank-emblem";
import { formatRankLabel } from "@/lib/game/rank-calculator";

export function PerformanceRankSlot({ rank }: { rank: { tier: string; rank: string } | null }) {
	return (
		<div className="flex w-24 items-center gap-1.5" title={rank ? "Performance rank: the level this game was played at" : undefined}>
			{rank && (
				<>
					<RankEmblem tier={rank.tier} size={20} />
					<span className="truncate text-2xs font-semibold text-foreground">{formatRankLabel(rank.tier, rank.rank)}</span>
				</>
			)}
		</div>
	);
}
