"use client";

import { useMemo } from "react";
import { useSummonerContext } from "@/components/summoner/shell/summoner-provider";
import { MatchList } from "@/components/summoner/matches/match-list";
import { Skeleton } from "@/components/ui/skeleton";
import { useLPHistory } from "@/hooks/useLPHistory";
import { useMatches } from "@/hooks/useMatches";
import { useRanked } from "@/hooks/useRanked";
import { useRunes } from "@/hooks/useRunes";
import { type Match } from "@/lib/validators/match";
import { AchievementPreview } from "./achievement-preview";
import { MostPlayedPanel } from "./most-played-panel";
import { RankedPanel } from "./ranked-panel";
import { RecentlyPlayedPanel } from "./recently-played-panel";
import { RolesPerformancePanel } from "./roles-performance-panel";

const INITIAL_MATCH_COUNT = 20;
const REMAINING_MATCH_COUNT = 30;

/** First 20 matches for a fast paint, then the next 30 by offset for the aggregate panels. */
export function useOverviewMatches(puuid: string): { matches?: Match[]; isLoading: boolean } {
	const { data: firstPage, isLoading } = useMatches(puuid, INITIAL_MATCH_COUNT);
	const { data: rest } = useMatches(firstPage ? puuid : undefined, REMAINING_MATCH_COUNT, undefined, INITIAL_MATCH_COUNT);
	const matches = useMemo(() => (firstPage ? [...firstPage, ...(rest ?? [])] : undefined), [firstPage, rest]);
	return { matches, isLoading };
}

/** Overview tab: stat column on the left, match list on the right. */
export function OverviewTab() {
	const { puuid, basePath, version } = useSummonerContext();
	const { data: ranked } = useRanked(puuid);
	const { data: runeData } = useRunes();
	const { matches, isLoading } = useOverviewMatches(puuid);
	const { data: soloHistory } = useLPHistory(puuid, "RANKED_SOLO_5x5");
	const { data: flexHistory } = useLPHistory(puuid, "RANKED_FLEX_SR");

	const solo = ranked?.find((e) => e.queueType === "RANKED_SOLO_5x5");
	const flex = ranked?.find((e) => e.queueType === "RANKED_FLEX_SR");

	return (
		<>
			<AchievementPreview puuid={puuid} basePath={basePath} />
			<div className="grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
				<div className="space-y-4">
					{ranked ? (
						<>
							<RankedPanel puuid={puuid} queueType="RANKED_SOLO_5x5" entry={solo} />
							<RankedPanel puuid={puuid} queueType="RANKED_FLEX_SR" entry={flex} />
						</>
					) : (
						<>
							<Skeleton className="h-36" />
							<Skeleton className="h-36" />
						</>
					)}
					{matches ? <RolesPerformancePanel matches={matches} puuid={puuid} /> : <Skeleton className="h-72" />}
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
						soloHistory={soloHistory}
						flexHistory={flexHistory}
					/>
				</div>
			</div>
		</>
	);
}
