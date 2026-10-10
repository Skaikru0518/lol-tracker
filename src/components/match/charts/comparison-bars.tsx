"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { formatThousands } from "@/lib/shared/format";
import { COMPARISON_METRICS, type ComparisonEntry, type ComparisonMetric, comparisonRows } from "@/lib/match/comparison";
import { buildScoreboard } from "@/lib/summoner/matches/scoreboard";
import { type Match } from "@/lib/validators/match";
import { TEAM_COLOR } from "./chart-theme";

function BarColumn({
	entries,
	max,
	topPuuid,
	side,
	version,
}: {
	entries: ComparisonEntry[];
	max: number;
	topPuuid: string | null;
	side: "blue" | "red";
	version: string;
}) {
	return (
		<ul className="flex h-full flex-col justify-around gap-2">
			{entries.map((e) => (
				<li key={e.puuid} className={cn("flex items-center gap-2", side === "blue" && "flex-row-reverse")}>
					<ChampionIcon version={version} championName={e.championName} size={22} />
					<div className={cn("flex h-2.5 flex-1 overflow-hidden rounded-full bg-muted", side === "blue" && "justify-end")}>
						<div
							className={cn("h-full animate-bar-grow rounded-full", side === "blue" ? "origin-right" : "origin-left")}
							style={{ width: `${(e.value / max) * 100}%`, background: e.puuid === topPuuid ? "var(--gold)" : TEAM_COLOR[side] }}
						/>
					</div>
					<span
						className={cn(
							"w-11 text-xs tabular-nums",
							side === "blue" ? "text-left" : "text-right",
							e.puuid === topPuuid ? "font-semibold text-gold" : "text-foreground",
						)}
					>
						{formatThousands(e.value)}
					</span>
				</li>
			))}
		</ul>
	);
}

/** Both teams' players side by side for one metric, blue mirrored left, the top value in gold; bars grow in and the body stretches to the row height. */
export function ComparisonBars({
	match,
	version,
	defaultMetric = "damage",
	title = "Players",
	metrics = COMPARISON_METRICS.map((m) => m.id),
}: {
	match: Match;
	version: string;
	defaultMetric?: ComparisonMetric;
	title?: string;
	metrics?: ComparisonMetric[];
}) {
	const [metric, setMetric] = useState<ComparisonMetric>(defaultMetric);
	const data = useMemo(() => buildScoreboard(match), [match]);
	const { blue, red, max, topPuuid } = useMemo(() => comparisonRows(data, metric), [data, metric]);

	return (
		<Panel className="flex h-full flex-col">
			<PanelHeader
				title={title}
				actions={
					metrics.length > 1 ? (
						<div className="flex gap-1 overflow-x-auto">
							{COMPARISON_METRICS.filter((m) => metrics.includes(m.id)).map((m) => (
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
					) : undefined
				}
			/>
			<div className="grid flex-1 grid-cols-2 gap-x-5 p-4">
				<BarColumn key={`blue-${metric}`} entries={blue} max={max} topPuuid={topPuuid} side="blue" version={version} />
				<BarColumn key={`red-${metric}`} entries={red} max={max} topPuuid={topPuuid} side="red" version={version} />
			</div>
		</Panel>
	);
}
