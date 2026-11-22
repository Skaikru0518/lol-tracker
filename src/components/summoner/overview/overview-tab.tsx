"use client";

import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSummonerContext } from "@/components/summoner/shell/summoner-provider";
import { MatchList } from "@/components/summoner/matches/match-list";
import { Skeleton } from "@/components/ui/skeleton";
import { useRankedLpHistories } from "@/hooks/useRankedLpHistories";
import { fetchMatches, useMatches } from "@/hooks/useMatches";
import { mergeMatchPages, MORE_MATCHES_PAGE, nextMatchStart } from "@/lib/summoner/matches/more-matches";
import { useRanked } from "@/hooks/useRanked";
import { useMmrEstimates } from "@/hooks/useMmrEstimates";
import { RANKED_QUEUE_TYPES } from "@/lib/game/ranked-queues";
import { useRiftMatches } from "@/hooks/useRiftMatches";
import { useRunes } from "@/hooks/useRunes";
import { overviewSettled } from "@/lib/summoner/profile/overview-settled";
import { type Match } from "@/lib/validators/match";
import { AchievementPreview } from "./achievement-preview";
import { MostPlayedPanel } from "./most-played-panel";
import { RankedPanel } from "./ranked-panel";
import { RecentlyPlayedPanel } from "./recently-played-panel";
import { RecentPerformancePanel } from "./recent-performance/recent-performance-panel";
import { RolesPerformancePanel } from "./roles-performance-panel";

const INITIAL_MATCH_COUNT = 20;
const REMAINING_MATCH_COUNT = 30;

/** First 20 matches for a fast paint, then the next 30 by offset; `settled` once both are stored. */
export function useOverviewMatches(puuid: string): { matches?: Match[]; isLoading: boolean; settled: boolean; restCount: number } {
	const { data: firstPage, isLoading, isError: firstFailed } = useMatches(puuid, INITIAL_MATCH_COUNT);
	const { data: rest, isFetched: restFetched } = useMatches(firstPage ? puuid : undefined, REMAINING_MATCH_COUNT, undefined, INITIAL_MATCH_COUNT);
	const matches = useMemo(() => (firstPage ? [...firstPage, ...(rest ?? [])] : undefined), [firstPage, rest]);
	return { matches, isLoading, settled: overviewSettled({ isError: firstFailed }, { isFetched: restFetched }), restCount: rest?.length ?? 0 };
}

/** Older games past the first 50, 50 per page, fetched only when the list asks for them. */
function useMoreMatches(puuid: string, restCount: number) {
	const [requested, setRequested] = useState(false);
	const query = useInfiniteQuery({
		// Outside the "matches" keys the Update button refreshes: older games never change
		queryKey: ["matches-more", puuid],
		queryFn: ({ pageParam }) => fetchMatches(puuid, MORE_MATCHES_PAGE, undefined, pageParam, true) as Promise<Match[]>,
		initialPageParam: INITIAL_MATCH_COUNT + REMAINING_MATCH_COUNT,
		getNextPageParam: (lastPage, _pages, lastStart) => nextMatchStart(lastPage.length, lastStart),
		staleTime: 1000 * 60 * 5,
		enabled: requested,
	});
	const more = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);
	return {
		more,
		// An empty second page means the player has no more than the games already shown
		// Until a first page arrives (it can fail when the Riot budget runs out) the button stays to retry it
		hasMore: requested ? query.hasNextPage || !query.data : restCount > 0,
		loadingMore: query.isFetching,
		loadMore: () => (!requested ? setRequested(true) : query.data ? void query.fetchNextPage() : void query.refetch()),
	};
}

/** Overview tab: stat column on the left, match list on the right. */
export function OverviewTab() {
	const { puuid, basePath, version } = useSummonerContext();
	const { data: ranked } = useRanked(puuid);
	const { data: runeData } = useRunes();
	const { matches, isLoading, settled, restCount } = useOverviewMatches(puuid);
	const { more, hasMore, loadingMore, loadMore } = useMoreMatches(puuid, restCount);
	const listMatches = useMemo(() => (matches ? mergeMatchPages(matches, more) : undefined), [matches, more]);
	// Read stored Rift games only after the Riot fetch has saved the newest ones
	const { data: riftMatches } = useRiftMatches(settled ? puuid : undefined, matches?.[0]?.metadata.matchId);
	const lpHistories = useRankedLpHistories(puuid);
	const { data: mmr } = useMmrEstimates(puuid, matches?.[0]?.metadata.matchId, settled);

	return (
		<>
			<AchievementPreview puuid={puuid} basePath={basePath} />
			<div className="grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
				<div className="space-y-4">
					{ranked
						? RANKED_QUEUE_TYPES.map((queueType) => (
								<RankedPanel
									key={queueType}
									puuid={puuid}
									queueType={queueType}
									entry={ranked.find((e) => e.queueType === queueType)}
									mmr={mmr?.estimates.find((e) => e.queueType === queueType)}
								/>
							))
						: RANKED_QUEUE_TYPES.map((queueType) => <Skeleton key={queueType} className="h-36" />)}
					{riftMatches ? <RolesPerformancePanel matches={riftMatches} puuid={puuid} /> : <Skeleton className="h-72" />}
					<MostPlayedPanel puuid={puuid} version={version} basePath={basePath} />
					<RecentlyPlayedPanel puuid={puuid} basePath={basePath} version={version} />
				</div>
				<div className="min-w-0 space-y-4">
					<RecentPerformancePanel puuid={puuid} version={version} newestMatchId={settled ? matches?.[0]?.metadata.matchId : undefined} />
					<MatchList
						matches={listMatches}
						puuid={puuid}
						version={version}
						isLoading={isLoading}
						runeData={runeData}
						lpHistories={lpHistories}
						rankedEntries={ranked}
						hasMore={settled && hasMore}
						loadingMore={loadingMore}
						onLoadMore={loadMore}
					/>
				</div>
			</div>
		</>
	);
}
