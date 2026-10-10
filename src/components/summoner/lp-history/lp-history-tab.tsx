"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useSummonerContext } from "@/components/summoner/shell/summoner-provider";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useLPHistory } from "@/hooks/useLPHistory";
import { type LpRange } from "@/lib/lp-history/range";
import { type RankedQueueType } from "@/lib/game/ranked-queues";
import { dailyLpPoints, lpChangeRows, lpChartNotice, lpSummary } from "@/lib/lp-history/summary";
import { LpChangesTable } from "./lp-changes-table";
import { LpChart } from "./lp-chart";
import { LpSummary } from "./lp-summary";

type Queue = RankedQueueType;

const QUEUES: { value: Queue; label: string }[] = [
	{ value: "RANKED_SOLO_5x5", label: "Solo/Duo" },
	{ value: "RANKED_FLEX_SR", label: "Flex" },
	{ value: "RANKED_PREMADE_5x5", label: "5s" },
];

const RANGES: { value: LpRange; label: string }[] = [
	{ value: "7d", label: "7D" },
	{ value: "30d", label: "30D" },
	{ value: "season", label: "Season" },
];

function Toggle<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
	return (
		<div className="flex gap-1">
			{options.map((o) => (
				<button
					key={o.value}
					type="button"
					onClick={() => onChange(o.value)}
					className={cn(
						"h-7 rounded-md border px-2.5 text-xs font-medium transition-colors",
						value === o.value ? "border-primary/50 bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground",
					)}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

/** LP History tab: queue and range toggles, summary, chart and the changes table. */
export function LpHistoryTab() {
	const { puuid } = useSummonerContext();
	const [queue, setQueue] = useState<Queue>("RANKED_SOLO_5x5");
	const [range, setRange] = useState<LpRange>("season");
	const { data: snapshots, isLoading } = useLPHistory(puuid, queue, range);
	const summary = useMemo(() => lpSummary(snapshots ?? []), [snapshots]);
	const rows = useMemo(() => lpChangeRows(snapshots ?? []), [snapshots]);
	const days = useMemo(() => dailyLpPoints(snapshots ?? []), [snapshots]);
	const rangeLabel = RANGES.find((r) => r.value === range)?.label ?? "";

	return (
		<div className="space-y-4">
			<Panel>
				<PanelHeader
					title={<Toggle options={QUEUES} value={queue} onChange={setQueue} />}
					actions={<Toggle options={RANGES} value={range} onChange={setRange} />}
				/>
				{isLoading ? (
					<Skeleton className="m-4 h-64" />
				) : !snapshots || snapshots.length === 0 ? (
					<EmptyState title="No LP history in this range" description="Snapshots are recorded while the profile is tracked." />
				) : (
					<>
						<LpSummary summary={summary} rangeLabel={rangeLabel} />
						{days.length > 1 ? <LpChart points={days} /> : <p className="p-4 text-sm text-muted-foreground">{lpChartNotice(days.length)}</p>}
					</>
				)}
			</Panel>
			{rows.length > 0 && (
				<Panel>
					<PanelHeader title="Changes" />
					<LpChangesTable key={`${queue}-${range}`} rows={rows} />
				</Panel>
			)}
		</div>
	);
}
