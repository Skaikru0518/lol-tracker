import { RankEmblem } from "@/components/ui/rank-emblem";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatRankLabel } from "@/lib/game/rank-calculator";

export function PerformanceRankSlot({ rank }: { rank: { tier: string; rank: string } | null }) {
	if (!rank) return <div className="w-24" />;
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div className="w-24 leading-tight">
					<p className="text-3xs text-muted-foreground">Match Performance</p>
					<div className="flex items-center gap-1">
						<RankEmblem tier={rank.tier} size={18} />
						<span className="truncate text-2xs font-semibold text-foreground">{formatRankLabel(rank.tier, rank.rank)}</span>
					</div>
				</div>
			</TooltipTrigger>
			<TooltipContent>The rank this game was played at: your score against your rank at the time.</TooltipContent>
		</Tooltip>
	);
}
