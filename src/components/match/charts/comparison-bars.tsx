"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { formatThousands } from "@/lib/format";
import { COMPARISON_METRICS, type ComparisonEntry, type ComparisonMetric, comparisonRows } from "@/lib/match/comparison";
import { buildScoreboard } from "@/lib/summoner/scoreboard";
import { type Match } from "@/lib/validators/match";
import { TEAM_COLOR } from "./chart-theme";

function BarColumn({ entries, max, side, version }: { entries: ComparisonEntry[]; max: number; side: "blue" | "red"; version: string }) {
	return (
		<ul className="flex h-full flex-col justify-around gap-2">
			{entries.map((e) => (
				<li key={e.puuid} className={cn("flex items-center gap-2", side === "blue" && "flex-row-reverse")}>
					<ChampionIcon version={version} championName={e.championName} size={22} />
					<div className={cn("flex h-2.5 flex-1 overflow-hidden rounded-full bg-muted", side === "blue" && "justify-end")}>
						<div className="h-full rounded-full" style={{ width: `${(e.value / max) * 100}%`, background: TEAM_COLOR[side] }} />
					</div>
					<span className={cn("w-11 text-xs tabular-nums text-foreground", side === "blue" ? "text-left" : "text-right")}>
						{formatThousands(e.value)}
					</span>
				</li>
			))}
		</ul>
	);
}

/** Both teams' players side by side for one metric, blue mirrored left; the body stretches to the row height. */
export function ComparisonBars({
	match,
	version,
	defaultMetric = "damage",
	title = "Players",
}: {
	match: Match;
	version: string;
	defaultMetric?: ComparisonMetric;
	title?: string;
}) {
	const [metric, setMetric] = useState<ComparisonMetric>(defaultMetric);
	const data = useMemo(() => buildScoreboard(match), [match]);
	const { blue, red, max } = useMemo(() => comparisonRows(data, metric), [data, metric]);

	return (
		<Panel className="flex h-full flex-col">
			<PanelHeader
				title={title}
				actions={
					<div className="flex gap-1 overflow-x-auto">
						{COMPARISON_METRICS.map((m) => (
							<button
								key={m.id}
								type="button"
								onClick={() => setMetric(m.id)}
								aria-pressed={m.id === metric}
								className={cn(
									"h-6 rounded-md border px-2 text-xs font-medium transition-colors",
									m.id === metric ? "border-primary/50 bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground",
								)}
							>
								{m.label}
							</button>
						))}
					</div>
				}
			/>
			<div className="grid flex-1 grid-cols-2 gap-x-5 p-4">
				<BarColumn entries={blue} max={max} side="blue" version={version} />
				<BarColumn entries={red} max={max} side="red" version={version} />
			</div>
		</Panel>
	);
}
