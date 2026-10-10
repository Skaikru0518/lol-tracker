"use client";

import { useMemo } from "react";
import { Panel, PanelBody } from "@/components/ui/panel";
import { FarmingChart } from "@/components/match/charts/farming-chart";
import { TimelineChartSlot } from "@/components/match/timeline-slot";
import { playerStatGroups } from "@/lib/match/detail";
import { StatList } from "./stat-list";
import { type PlayerTabProps } from "./player-tabs";

/** Income stats of the player and team CS and gold over time. */
export function FarmingTab({ match, timeline, timelineState, player }: PlayerTabProps) {
	const groups = useMemo(() => playerStatGroups(player, match.info.gameDuration), [player, match]);

	return (
		<div className="space-y-4">
			<Panel>
				<PanelBody className="max-w-sm">
					<StatList title="Income" stats={groups.income} />
				</PanelBody>
			</Panel>
			<TimelineChartSlot title="CS over time" state={timelineState}>
				{timeline && <FarmingChart timeline={timeline} />}
			</TimelineChartSlot>
		</div>
	);
}
