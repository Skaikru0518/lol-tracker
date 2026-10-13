import { RankEmblem } from "@/components/ui/rank-emblem";
import { formatRankLabel } from "@/lib/game/rank-calculator";

export function PerformanceRankSlot({ rank }: { rank: { tier: string; rank: string } | null }) {
	return (
		<div className="w-24 leading-tight" title={rank ? "The level this game was played at" : undefined}>
			{rank && (
				<>
					<p className="text-3xs text-muted-foreground">Match Performance</p>
					<div className="flex items-center gap-1">
						<RankEmblem tier={rank.tier} size={18} />
						<span className="truncate text-2xs font-semibold text-foreground">{formatRankLabel(rank.tier, rank.rank)}</span>
					</div>
				</>
			)}
		</div>
	);
}
