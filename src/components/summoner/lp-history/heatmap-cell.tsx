import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cellTone, HEATMAP_DAYS, slotLabel, type HeatmapCell as Cell } from "@/lib/lp-history/heatmap";

/** One weekday × slot cell: loss red to win green by win rate; only the color fades with fewer games, the label stays readable. */
export function HeatmapCell({ cell }: { cell: Cell }) {
	const tone = cellTone(cell);
	const losses = cell.games - cell.wins;
	const background = tone
		? `color-mix(in oklab, color-mix(in oklab, var(--win) ${tone.winRate}%, var(--loss)) ${Math.round(25 + 45 * tone.confidence)}%, transparent)`
		: "var(--muted)";
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div className="flex h-8 items-center justify-center rounded-sm text-3xs font-semibold text-foreground" style={{ backgroundColor: background }}>
					{tone && (
						<>
							{tone.winRate}
							<span className="hidden sm:inline">%</span>
						</>
					)}
				</div>
			</TooltipTrigger>
			<TooltipContent>
				<p>
					{HEATMAP_DAYS[cell.day]} {slotLabel(cell.slot)}
				</p>
				<p>{cell.games === 0 ? "No games" : `${cell.wins}W ${losses}L${tone ? ` · ${tone.winRate}%` : " · too few games"}`}</p>
			</TooltipContent>
		</Tooltip>
	);
}
