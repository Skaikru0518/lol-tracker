"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/ui/panel";
import { TimelinePart } from "@/components/match/timeline-slot";
import { type TimelineState } from "@/lib/match/detail";
import { type RuneMaps } from "@/lib/summoner/matches/match-row";
import { type Match, type Participant } from "@/lib/validators/match";
import { type Timeline } from "@/lib/validators/timeline";
import { FarmingTab } from "./farming-tab";
import { FightingTab } from "./fighting-tab";
import { ObjectivesTab } from "./objectives-tab";
import { OverviewTab } from "./overview-tab";
import { PerformanceTab } from "./performance-tab";
import { VisionTab } from "./vision-tab";

export interface PlayerTabProps {
	match: Match;
	timeline?: Timeline;
	timelineState: TimelineState;
	player: Participant;
	participantId: number;
	version: string;
	runeData?: RuneMaps;
	itemNames?: Map<number, string>;
	badgeIds: string[];
}

const TABS = [
	{ id: "overview", label: "Overview", needsTimeline: false, Component: OverviewTab },
	{ id: "performance", label: "Performance", needsTimeline: false, Component: PerformanceTab },
	{ id: "fighting", label: "Fighting", needsTimeline: false, Component: FightingTab },
	{ id: "farming", label: "Farming", needsTimeline: false, Component: FarmingTab },
	{ id: "objectives", label: "Objectives", needsTimeline: true, Component: ObjectivesTab },
	{ id: "vision", label: "Vision", needsTimeline: false, Component: VisionTab },
] as const;

/** Tab bar for the selected player's views. */
export function PlayerTabs(props: PlayerTabProps) {
	const [active, setActive] = useState<(typeof TABS)[number]["id"]>("overview");
	const tab = TABS.find((t) => t.id === active) ?? TABS[0];

	return (
		<div className="space-y-4">
			<Panel>
				<div role="tablist" aria-label="Player details" className="flex gap-5 overflow-x-auto overflow-y-hidden px-4">
					{TABS.map((t) => (
						<button
							key={t.id}
							type="button"
							role="tab"
							aria-selected={t.id === active}
							onClick={() => setActive(t.id)}
							className={cn(
								"-mb-px border-b-2 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
								t.id === active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
							)}
						>
							{t.label}
						</button>
					))}
				</div>
			</Panel>
			{tab.needsTimeline && props.timelineState !== "ready" ? (
				<Panel>
					<TimelinePart state={props.timelineState} height="h-64">
						{null}
					</TimelinePart>
				</Panel>
			) : (
				<tab.Component {...props} />
			)}
		</div>
	);
}
