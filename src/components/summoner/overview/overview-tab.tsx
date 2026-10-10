"use client";

import { useMemo } from "react";
import { useSummonerContext } from "@/components/summoner/shell/summoner-provider";
import { MatchList } from "@/components/summoner/matches/match-list";
import { Skeleton } from "@/components/ui/skeleton";
import { useRankedLpHistories } from "@/hooks/useRankedLpHistories";
import { useMatches } from "@/hooks/useMatches";
import { useRanked } from "@/hooks/useRanked";
import { RANKED_QUEUE_TYPES } from "@/lib/ranked-queues";
import { useRiftMatches } from "@/hooks/useRiftMatches";
import { useRunes } from "@/hooks/useRunes";
import { overviewSettled } from "@/lib/summoner/overview-settled";
import { type Match } from "@/lib/validators/match";
import { AchievementPreview } from "./achievement-preview";
import { MostPlayedPanel } from "./most-played-panel";
import { RankedPanel } from "./ranked-panel";
import { RecentlyPlayedPanel } from "./recently-played-panel";
import { RolesPerformancePanel } from "./roles-performance-panel";

const INITIAL_MATCH_COUNT = 20;
const REMAINING_MATCH_COUNT = 30;

/** First 20 matches for a fast paint, then the next 30 by offset; `settled` once both are stored. */
export function useOverviewMatches(puuid: string): { matches?: Match[]; isLoading: boolean; settled: boolean } {
	const { data: firstPage, isLoading, isError: firstFailed } = useMatches(puuid, INITIAL_MATCH_COUNT);
	const { data: rest, isFetched: restFetched } = useMatches(firstPage ? puuid : undefined, REMAINING_MATCH_COUNT, undefined, INITIAL_MATCH_COUNT);
	const matches = useMemo(() => (firstPage ? [...firstPage, ...(rest ?? [])] : undefined), [firstPage, rest]);
	return { matches, isLoading, settled: overviewSettled({ isError: firstFailed }, { isFetched: restFetched }) };
}

/** Overview tab: stat column on the left, match list on the right. */
export function OverviewTab() {
	const { puuid, basePath, version } = useSummonerContext();
	const { data: ranked } = useRanked(puuid);
	const { data: runeData } = useRunes();
	const { matches, isLoading, settled } = useOverviewMatches(puuid);
	// Read stored Rift games only after the Riot fetch has saved the newest ones
	const { data: riftMatches } = useRiftMatches(settled ? puuid : undefined);
	const lpHistories = useRankedLpHistories(puuid);

	return (
		<>
			<AchievementPreview puuid={puuid} basePath={basePath} />
			<div className="grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
				<div className="space-y-4">
					{ranked
						? RANKED_QUEUE_TYPES.map((queueType) => (
								<RankedPanel key={queueType} puuid={puuid} queueType={queueType} entry={ranked.find((e) => e.queueType === queueType)} />
							))
						: RANKED_QUEUE_TYPES.map((queueType) => <Skeleton key={queueType} className="h-36" />)}
					{riftMatches ? <RolesPerformancePanel matches={riftMatches} puuid={puuid} /> : <Skeleton className="h-72" />}
					<MostPlayedPanel puuid={puuid} version={version} basePath={basePath} />
					{matches && <RecentlyPlayedPanel matches={matches} puuid={puuid} version={version} />}
				</div>
				<div className="min-w-0">
					<MatchList
						matches={matches}
						puuid={puuid}
						version={version}
						isLoading={isLoading}
						runeData={runeData}
						lpHistories={lpHistories}
					/>
				</div>
			</div>
		</>
	);
}
