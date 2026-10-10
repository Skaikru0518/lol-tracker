"use client";

import { useMemo, useState } from "react";
import { useSummonerContext } from "@/components/summoner/shell/summoner-provider";
import { MatchFilters } from "@/components/summoner/matches/match-filters";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllMasteries } from "@/hooks/useAllMasteries";
import { useChampionStats } from "@/hooks/useChampionStats";
import { useChampions } from "@/hooks/useChampions";
import { type QueueFilter } from "@/lib/game/queue-filters";
import { mergeChampionRows } from "@/lib/summoner/champions/champion-rows";
import { ChampionStatsTable } from "./champion-stats-table";
import { MasteryOnlyList } from "./mastery-only-list";

/** Champions tab: stats table from stored matches with mastery, then mastery-only champions. */
export function ChampionsTab() {
	const { puuid, basePath, version } = useSummonerContext();
	const [queue, setQueue] = useState<QueueFilter>("all");
	const { data: stats, isLoading } = useChampionStats(puuid, queue);
	const { data: masteries } = useAllMasteries(puuid);
	const { data: champions } = useChampions();
	const { rows, masteryOnly } = useMemo(
		() => mergeChampionRows(stats, masteries ?? [], champions),
		[stats, masteries, champions],
	);

	return (
		<div className="space-y-4">
			<Panel>
				<PanelHeader
					title={
						<>
							Champion stats <span className="font-normal text-muted-foreground">· stored matches</span>
						</>
					}
					actions={<MatchFilters queue={queue} onQueueChange={setQueue} />}
				/>
				{isLoading ? (
					<div className="space-y-2 p-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<Skeleton key={i} className="h-10" />
						))}
					</div>
				) : rows.length === 0 ? (
					<EmptyState title="No stored games for this queue" />
				) : (
					<ChampionStatsTable rows={rows} version={version} basePath={basePath} />
				)}
			</Panel>

			{queue === "all" && masteryOnly.length > 0 && (
				<Panel>
					<PanelHeader title="Other champions" actions={<span className="text-xs text-muted-foreground">mastery only</span>} />
					<MasteryOnlyList rows={masteryOnly} version={version} />
				</Panel>
			)}
		</div>
	);
}
