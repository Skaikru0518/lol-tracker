"use client";

import { useMemo, useState } from "react";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useMatchBadgesBatch } from "@/hooks/useMatchBadges";
import { usePerformanceSummaries } from "@/hooks/usePerformance";
import { isAchievementEligible } from "@/lib/achievements/eligibility";
import { type QueueFilter } from "@/lib/game/queue-filters";
import { type LpHistories, RANKED_QUEUE_TYPES, rankedQueueForQueueId } from "@/lib/game/ranked-queues";
import { lpChangesForGames } from "@/lib/summoner/profile/lp-estimate";
import { filterMatches } from "@/lib/summoner/matches/match-filter";
import { type RuneMaps } from "@/lib/summoner/matches/match-row";
import { type Match } from "@/lib/validators/match";
import { PerformanceHelp } from "@/components/match/performance/performance-help";
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
	const scorableIds = useMemo(
		() => matches?.filter((m) => isAchievementEligible(m.info.queueId, m.info.gameDuration)).map((m) => m.metadata.matchId),
		[matches],
	);
	const { data: performance, isLoading: performanceLoading } = usePerformanceSummaries(scorableIds, puuid);
	const lpChanges = useMemo(() => {
		const changes = new Map<string, number>();
		for (const queue of RANKED_QUEUE_TYPES) {
			const games = (matches ?? []).flatMap((m) => {
				const player = m.info.participants.find((p) => p.puuid === puuid);
				if (!player || rankedQueueForQueueId(m.info.queueId) !== queue || !isAchievementEligible(m.info.queueId, m.info.gameDuration)) return [];
				return [{ id: m.metadata.matchId, end: m.info.gameCreation + m.info.gameDuration * 1000, win: player.win }];
			});
			for (const [id, lp] of lpChangesForGames(lpHistories?.[queue], games)) changes.set(id, lp);
		}
		return changes;
	}, [matches, puuid, lpHistories]);
	const filtered = useMemo(() => (matches ? filterMatches(matches, puuid, queue, null) : []), [matches, puuid, queue]);

	return (
		<Panel>
			<div className="flex flex-col gap-2 border-b px-4 py-2.5 sm:flex-row sm:items-center">
				<div className="flex items-center gap-1.5">
					<h2 className="text-sm font-semibold text-foreground">Recent games</h2>
					<TooltipProvider delayDuration={200}>
						<PerformanceHelp />
					</TooltipProvider>
				</div>
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
						const { queueId, gameDuration } = match.info;
						const lpChange = lpChanges.get(match.metadata.matchId) ?? null;
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
								performance={performance?.[match.metadata.matchId] ?? null}
								performanceLoading={performanceLoading && isAchievementEligible(queueId, gameDuration)}
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
