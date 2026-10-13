import { ArrowDown, ArrowUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatRankLabel } from "@/lib/game/rank-calculator";
import { mmrTooltip } from "@/lib/summoner/profile/mmr-estimate";
import { type MmrEstimate } from "@/lib/validators/mmr";

export function MmrLine({ estimate }: { estimate: MmrEstimate }) {
	return (
		<TooltipProvider delayDuration={200}>
			<Tooltip>
				<TooltipTrigger asChild>
					<p className="mt-0.5 flex w-fit items-center gap-1 text-xs text-muted-foreground">
						Est. MMR: <span className="font-semibold text-foreground">{formatRankLabel(estimate.tier, estimate.rank)}</span>
						{estimate.direction === "above" && <ArrowUp className="size-3 text-win" />}
						{estimate.direction === "below" && <ArrowDown className="size-3 text-loss" />}
					</p>
				</TooltipTrigger>
				<TooltipContent>{mmrTooltip(estimate)}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
