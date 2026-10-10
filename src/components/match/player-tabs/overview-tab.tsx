"use client";

import { useMemo } from "react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { StatRing } from "@/components/ui/stat-ring";
import { MatchBadges } from "@/components/summoner/matches/match-badges";
import ItemBuild from "@/components/match/item-build";
import SkillOrder from "@/components/match/skill-order";
import { usePerks } from "@/hooks/usePerks";
import { playerShares } from "@/lib/match/detail";
import { TimelinePart } from "@/components/match/timeline-slot";
import { RunePage } from "./rune-page";
import { type PlayerTabProps } from "./player-tabs";

/** Badges, share rings, item build, skill order and runes of the selected player. */
export function OverviewTab({ match, timeline, timelineState, player, participantId, version, runeData, itemNames, badgeIds }: PlayerTabProps) {
	const shares = useMemo(() => playerShares(match, player), [match, player]);
	const { data: perks } = usePerks();

	return (
		<div className="space-y-4">
			<Panel>
				<PanelBody className="space-y-4">
					{badgeIds.length > 0 && (
						<div className="flex justify-center">
							<MatchBadges badgeIds={badgeIds} />
						</div>
					)}
					<div className="flex flex-wrap justify-around gap-4">
						<StatRing label="Damage share" value={shares.damageShare} display={`${shares.damageShare}%`} />
						<StatRing label="Gold share" value={shares.goldShare} display={`${shares.goldShare}%`} color="var(--gold)" />
						<StatRing label="KP" value={shares.killParticipation} display={`${shares.killParticipation}%`} color="var(--win)" />
						<StatRing label="CS/min" value={shares.csPerMin} max={10} display={shares.csPerMin} color="var(--team-blue)" />
						<StatRing label="Vision" value={shares.visionScore} max={100} display={shares.visionScore} color="var(--muted-foreground)" />
					</div>
				</PanelBody>
			</Panel>
			<Panel>
				<PanelHeader title="Item build" />
				<PanelBody>
					<TimelinePart state={timelineState}>
						<ItemBuild timeline={timeline} participantId={participantId} version={version} itemNames={itemNames} />
					</TimelinePart>
				</PanelBody>
			</Panel>
			<div className="grid gap-4 lg:grid-cols-2">
				<Panel>
					<PanelHeader title="Skill order" />
					<PanelBody>
						<TimelinePart state={timelineState}>
							<SkillOrder timeline={timeline} participantId={participantId} version={version} championName={player.championName} />
						</TimelinePart>
					</PanelBody>
				</Panel>
				<Panel>
					<PanelHeader title="Runes" />
					<PanelBody>
						<RunePage player={player} runeData={runeData} perks={perks} />
					</PanelBody>
				</Panel>
			</div>
		</div>
	);
}
