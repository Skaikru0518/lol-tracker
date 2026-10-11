"use client";

import { Fragment } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useWinrateHeatmap } from "@/hooks/useWinrateHeatmap";
import { HEATMAP_DAYS, heatmapExtremes, MIN_EXTREME_GAMES, SLOT_COUNT, SLOT_HOURS, slotLabel, type HeatmapCell as Cell } from "@/lib/lp-history/heatmap";
import { type LpRange } from "@/lib/lp-history/range";
import { queryFailed } from "@/lib/shared/query-state";
import { HeatmapCell } from "./heatmap-cell";

const slotSummary = (cell: Cell) => `${HEATMAP_DAYS[cell.day].slice(0, 3)} ${slotLabel(cell.slot)} (${Math.round((cell.wins / cell.games) * 100)}%, ${cell.games} games)`;

/** Ranked win rate by Budapest weekday and 3-hour slot, all ranked queues, over the selected range. */
export function WinrateHeatmap({ puuid, range, rangeLabel }: { puuid: string; range: LpRange; rangeLabel: string }) {
	const { data, isLoading, isError } = useWinrateHeatmap(puuid, range);
	const extremes = data ? heatmapExtremes(data.cells) : null;

	return (
		<Panel>
			<PanelHeader title="Win rate by time" />
			{isLoading ? (
				<Skeleton className="m-4 h-56" />
			) : queryFailed({ isError, data }) ? (
				<EmptyState title="Win rates unavailable" description="Try again in a moment." />
			) : !data || data.games === 0 ? (
				<EmptyState title="No ranked games in this range" description="Stored Solo, Flex and 5s games show up here." />
			) : (
				<TooltipProvider delayDuration={150}>
					<div className="space-y-3 p-4">
						<div className="space-y-1 text-xs text-muted-foreground">
							<p>
								{data.games} ranked games (Solo, Flex and 5s) · {rangeLabel} · Budapest time
							</p>
							<p>
								{extremes ? (
									<>
										Best: <span className="font-semibold text-win">{slotSummary(extremes.best)}</span> · Worst:{" "}
										<span className="font-semibold text-loss">{slotSummary(extremes.worst)}</span>
									</>
								) : (
									`Best and worst slots need ${MIN_EXTREME_GAMES}+ games in at least two slots with different win rates.`
								)}
							</p>
						</div>
						<div className="grid grid-cols-[auto_repeat(8,minmax(0,1fr))] gap-1">
							<span />
							{Array.from({ length: SLOT_COUNT }, (_, slot) => (
								<span key={slot} className="text-center text-3xs text-muted-foreground">
									<span className="sm:hidden">{slot * SLOT_HOURS}</span>
									<span className="hidden sm:inline">{slotLabel(slot)}</span>
								</span>
							))}
							{HEATMAP_DAYS.map((day, dayIndex) => (
								<Fragment key={day}>
									<span className="flex items-center pr-1 text-2xs text-muted-foreground">{day.slice(0, 3)}</span>
									{data.cells
										.filter((c) => c.day === dayIndex)
										.map((cell) => (
											<HeatmapCell key={cell.slot} cell={cell} />
										))}
								</Fragment>
							))}
						</div>
					</div>
				</TooltipProvider>
			)}
		</Panel>
	);
}
