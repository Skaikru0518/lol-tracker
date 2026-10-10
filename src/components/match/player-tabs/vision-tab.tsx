"use client";

import { useMemo } from "react";
import { Panel, PanelBody } from "@/components/ui/panel";
import { ComparisonBars } from "@/components/match/charts/comparison-bars";
import { playerStatGroups } from "@/lib/match/detail";
import { StatList } from "./stat-list";
import { type PlayerTabProps } from "./player-tabs";

/** Vision stats of the player and every player's vision score as comparison bars. */
export function VisionTab({ match, player, version }: PlayerTabProps) {
	const groups = useMemo(() => playerStatGroups(player, match.info.gameDuration), [player, match]);

	return (
		<div className="space-y-4">
			<Panel>
				<PanelBody className="max-w-sm">
					<StatList title="Vision" stats={groups.vision} />
				</PanelBody>
			</Panel>
			<ComparisonBars match={match} version={version} defaultMetric="vision" title="Vision" metrics={["vision"]} />
		</div>
	);
}
