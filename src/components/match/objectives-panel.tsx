"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { formatDuration } from "@/lib/format";
import { type FirstTaken, gameEndMs, killTicks, objectiveEvents, objectiveSummary, type Side } from "@/lib/match/timeline-events";
import { type Timeline } from "@/lib/validators/timeline";

const SIDE_TEXT: Record<Side, string> = { blue: "text-team-blue", red: "text-team-red" };
const SIDE_BORDER: Record<Side, string> = { blue: "border-team-blue", red: "border-team-red" };
const clock = (ms: number) => formatDuration(ms / 1000);

function First({ label, taken }: { label: string; taken: FirstTaken | null }) {
	return (
		<span className="rounded-md border px-2 py-1 text-xs">
			{label}{" "}
			{taken ? (
				<>
					<b className={SIDE_TEXT[taken.side]}>{taken.side === "blue" ? "Blue" : "Red"}</b> <span className="text-muted-foreground">{clock(taken.timestamp)}</span>
				</>
			) : (
				<span className="text-muted-foreground">—</span>
			)}
		</span>
	);
}

/** Objectives on a blue (top) and red (bottom) lane across the game, kill ticks along the axis, the firsts and counts, and a collapsible list. */
export function ObjectivesPanel({ timeline }: { timeline: Timeline }) {
	const objectives = useMemo(() => objectiveEvents(timeline), [timeline]);
	const kills = useMemo(() => killTicks(timeline), [timeline]);
	const summary = useMemo(() => objectiveSummary(timeline), [timeline]);
	const [open, setOpen] = useState(false);
	const end = gameEndMs(timeline);
	const left = (ms: number) => `${Math.min((ms / end) * 100, 100)}%`;
	const minuteMarks = Array.from({ length: Math.floor(end / 300_000) + 1 }, (_, i) => i * 5);

	return (
		<Panel>
			<PanelHeader title="Objectives" />
			<div className="relative mx-4 my-4 h-36">
				<div className="absolute inset-x-0 top-0 h-12 rounded-md bg-team-blue/10" />
				<div className="absolute inset-x-0 bottom-0 h-12 rounded-md bg-team-red/10" />
				<div className="absolute inset-x-0 top-[3.75rem] flex h-4 justify-between border-y border-dashed text-3xs text-muted-foreground">
					{minuteMarks.map((m) => (
						<span key={m} className="absolute -translate-x-1/2 leading-4" style={{ left: left(m * 60_000) }}>
							{m}
						</span>
					))}
				</div>
				{kills.map((k, i) => (
					<span
						key={i}
						className={cn("absolute h-2.5 w-0.5 -translate-x-1/2 rounded-sm", k.side === "blue" ? "top-[3.1rem] bg-team-blue" : "top-[4.9rem] bg-team-red")}
						style={{ left: left(k.timestamp) }}
					/>
				))}
				{objectives.map((o, i) => (
					<img
						key={`${o.timestamp}-${i}`}
						src={o.icon}
						alt={o.label}
						title={`${o.label} · ${o.side === "blue" ? "Blue" : "Red"} · ${clock(o.timestamp)}`}
						className={cn("absolute size-6 -translate-x-1/2 rounded-full border-2 bg-card p-0.5", SIDE_BORDER[o.side], o.side === "blue" ? "top-3" : "bottom-3")}
						style={{ left: left(o.timestamp) }}
					/>
				))}
			</div>
			<div className="flex flex-wrap gap-1.5 px-4 pb-4">
				<First label="First blood" taken={summary.firstBlood} />
				<First label="First tower" taken={summary.firstTower} />
				<First label="First dragon" taken={summary.firstDragon} />
				{(["dragons", "grubs", "barons", "towers"] as const).map((key) => (
					<span key={key} className="rounded-md border px-2 py-1 text-xs capitalize">
						{key} <b className="text-team-blue">{summary.counts[key].blue}</b>–<b className="text-team-red">{summary.counts[key].red}</b>
					</span>
				))}
			</div>
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-center justify-center gap-1 border-t py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
			>
				Event list <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
			</button>
			{open && (
				<ul className="divide-y divide-border/50 border-t">
					{objectives.map((o, i) => (
						<li key={`${o.timestamp}-${i}`} className="flex items-center gap-2 px-4 py-1.5 text-sm">
							<span className="w-11 tabular-nums text-muted-foreground">{clock(o.timestamp)}</span>
							<img src={o.icon} alt="" width={18} height={18} className="size-4.5" />
							<span className="text-foreground">{o.label}</span>
							<span className={cn("ml-auto text-xs font-semibold", SIDE_TEXT[o.side])}>{o.side === "blue" ? "Blue" : "Red"}</span>
						</li>
					))}
				</ul>
			)}
		</Panel>
	);
}
