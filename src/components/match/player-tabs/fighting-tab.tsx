"use client";

import { useMemo } from "react";
import { Panel, PanelBody } from "@/components/ui/panel";
import { FightMap } from "@/components/match/fight-map";
import { TeamAreaChart } from "@/components/match/charts/team-area-chart";
import { TimelineChartSlot } from "@/components/match/timeline-slot";
import { playerStatGroups } from "@/lib/match/detail";
import { cumulativeKills } from "@/lib/match/timeline-events";
import { StatList } from "./stat-list";
import { type PlayerTabProps } from "./player-tabs";

/** Damage, survivability and combat stats, team kills over time and the player's kill map with its event list. */
export function FightingTab({ match, timeline, timelineState, player, participantId, version }: PlayerTabProps) {
	const groups = useMemo(() => playerStatGroups(player, match.info.gameDuration), [player, match]);
	const kills = useMemo(() => (timeline ? cumulativeKills(timeline) : []), [timeline]);

	return (
		<div className="space-y-4">
			<Panel>
				<PanelBody className="grid gap-6 sm:grid-cols-3">
					<StatList title="Damage" stats={groups.damage} />
					<StatList title="Survivability" stats={groups.survivability} />
					<StatList title="Combat" stats={groups.combat} />
				</PanelBody>
			</Panel>
			<TimelineChartSlot title="Kills over time" state={timelineState}>
				<TeamAreaChart title="Kills over time" data={kills} />
			</TimelineChartSlot>
			<TimelineChartSlot title="Kills & deaths" state={timelineState}>
				{timeline && <FightMap timeline={timeline} participantId={participantId} participants={match.info.participants} version={version} />}
			</TimelineChartSlot>
		</div>
	);
}
