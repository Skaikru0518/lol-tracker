"use client";

import { useMemo } from "react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import KillMap from "@/components/match/kill-map";
import KillTimeline from "@/components/match/kill-timeline";
import { EmptyState } from "@/components/ui/empty-state";
import { TimelineChartSlot, TimelinePart } from "@/components/match/timeline-slot";
import { hasChampionKillEvents, playerStatGroups } from "@/lib/match/detail";
import { StatList } from "./stat-list";
import { type PlayerTabProps } from "./player-tabs";

/** Damage, survivability and combat stats, team kills over time and the player's kill map. */
export function FightingTab({ match, timeline, timelineState, player, participantId, version }: PlayerTabProps) {
	const groups = useMemo(() => playerStatGroups(player, match.info.gameDuration), [player, match]);

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
				<KillTimeline timeline={timeline} participants={match.info.participants} />
			</TimelineChartSlot>
			<Panel>
				<PanelHeader title="Kill map" />
				<PanelBody className="flex justify-center">
					<TimelinePart state={timelineState}>
						{timeline && hasChampionKillEvents(timeline, participantId) ? (
							<KillMap timeline={timeline} participantId={participantId} version={version} />
						) : (
							<EmptyState title="No kills or deaths" />
						)}
					</TimelinePart>
				</PanelBody>
			</Panel>
		</div>
	);
}
