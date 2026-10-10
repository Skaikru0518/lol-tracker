"use client";

import { useMemo, useState } from "react";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useMatchBadgesBatch } from "@/hooks/useMatchBadges";
import { type QueueFilter } from "@/lib/game/queue-filters";
import { type LpHistories, rankedQueueForQueueId } from "@/lib/game/ranked-queues";
import { calculateLPChange } from "@/lib/summoner/profile/lp-change";
import { filterMatches } from "@/lib/summoner/matches/match-filter";
import { type RuneMaps } from "@/lib/summoner/matches/match-row";
import { type Match } from "@/lib/validators/match";
import { MatchFilters } from "./match-filters";
import { MatchRow } from "./match-row";

const PAGE_SIZE = 20;

/** Recent games panel: queue chips, match rows C with LP change and badges, load more. */
export function MatchList({
	matches,
	puuid,
	version,
	isLoading,
	runeData,
	lpHistories,
}: {
	matches?: Match[];
	puuid: string;
	version?: string;
	isLoading: boolean;
	runeData?: RuneMaps;
	lpHistories?: LpHistories;
}) {
	const [queue, setQueue] = useState<QueueFilter>("all");
	const [visible, setVisible] = useState(PAGE_SIZE);
	const matchIds = useMemo(() => matches?.map((m) => m.metadata.matchId), [matches]);
	const { data: badges } = useMatchBadgesBatch(matchIds);
	const filtered = useMemo(() => (matches ? filterMatches(matches, puuid, queue, null) : []), [matches, puuid, queue]);

	return (
		<Panel>
			<div className="flex flex-col gap-2 border-b px-4 py-2.5 sm:flex-row sm:items-center">
				<h2 className="text-sm font-semibold text-foreground">Recent games</h2>
				<div className="sm:ml-auto sm:w-auto">
					<MatchFilters
						queue={queue}
						onQueueChange={(next) => {
							setQueue(next);
							setVisible(PAGE_SIZE);
						}}
					/>
				</div>
			</div>

			{isLoading || !version ? (
				<div className="space-y-2 p-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className="h-16" />
					))}
				</div>
			) : filtered.length === 0 ? (
				<EmptyState title={matches?.length ? "No games for this filter" : "No matches found"} />
			) : (
				<TooltipProvider delayDuration={200}>
					{filtered.slice(0, visible).map((match) => {
						const player = match.info.participants.find((p) => p.puuid === puuid);
						if (!player) return null;
						const { queueId, gameCreation, gameDuration } = match.info;
						const rankedQueue = rankedQueueForQueueId(queueId);
						const lpChange = rankedQueue ? calculateLPChange(lpHistories?.[rankedQueue], gameCreation + gameDuration * 1000) : null;
						const badgeIds = (badges?.[match.metadata.matchId] ?? []).filter((b) => b.puuid === puuid).map((b) => b.badgeId);

						return (
							<MatchRow
								key={match.metadata.matchId}
								match={match}
								player={player}
								version={version}
								runeData={runeData}
								lpChange={lpChange}
								badgeIds={badgeIds}
								matchBadges={badges?.[match.metadata.matchId]}
							/>
						);
					})}
					{visible < filtered.length && (
						<div className="p-3">
							<Button variant="outline" className="w-full" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
								Load more
							</Button>
						</div>
					)}
				</TooltipProvider>
			)}
		</Panel>
	);
}
