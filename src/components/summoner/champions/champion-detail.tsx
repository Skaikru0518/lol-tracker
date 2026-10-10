"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSummonerContext } from "@/components/summoner/shell/summoner-provider";
import { MatchList } from "@/components/summoner/matches/match-list";
import { HeroBanner } from "@/components/ui/hero-banner";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllMasteries } from "@/hooks/useAllMasteries";
import { useChampionStats } from "@/hooks/useChampionStats";
import { useChampions } from "@/hooks/useChampions";
import { useRankedLpHistories } from "@/hooks/useRankedLpHistories";
import { useMatches } from "@/hooks/useMatches";
import { useRunes } from "@/hooks/useRunes";
import { formatPoints } from "@/lib/format";
import { getChampionSplash } from "@/lib/icon-helpers";
import { queryFailed } from "@/lib/query-state";
import { averageKillParticipation, findChampionBySlug } from "@/lib/summoner/champion-slug";
import { ChampionSummary } from "./champion-summary";

// Stored games only (Riot cannot filter by champion); MatchList pages through them 20 at a time
const CHAMPION_MATCH_COUNT = 50;

/** Champion sub-page: splash header with mastery, summary strip and matches on that champion. */
export function ChampionDetail({ slug }: { slug: string }) {
	const { puuid, gameName, tagLine, basePath, version } = useSummonerContext();
	const { data: champions, isLoading: championsLoading, isError: championsError } = useChampions();
	const championsFailed = queryFailed({ isError: championsError, data: champions });
	const champion = findChampionBySlug(champions, slug);
	const championId = champion ? Number(champion.key) : undefined;

	const { data: matches, isLoading } = useMatches(championId ? puuid : undefined, CHAMPION_MATCH_COUNT, championId);
	const { data: stats } = useChampionStats(puuid, "all");
	const { data: masteries } = useAllMasteries(puuid);
	const { data: runeData } = useRunes();
	const lpHistories = useRankedLpHistories(puuid);

	const stat = stats?.find((s) => s.championId === championId);
	const mastery = masteries?.find((m) => m.championId === championId);
	const kp = useMemo(() => (matches ? averageKillParticipation(matches, puuid) : null), [matches, puuid]);

	if (championsFailed) {
		return (
			<Panel>
				<EmptyState title="Champion data unavailable" description="Data Dragon could not be reached. Try again in a minute." />
			</Panel>
		);
	}
	if (championsLoading || !champions) return <Skeleton className="h-40" />;
	if (!champion) {
		return (
			<Panel>
				<EmptyState
					title="Champion not found"
					action={
						<Link href={`${basePath}/champions`} className="text-sm font-medium text-primary hover:underline">
							&larr; All champions
						</Link>
					}
				/>
			</Panel>
		);
	}

	return (
		<div className="space-y-4">
			<HeroBanner splashUrl={getChampionSplash(champion.id)} className="rounded-lg border">
				<div className="flex h-32 flex-col justify-end p-5">
					<Link href={`${basePath}/champions`} className="mb-auto text-xs font-medium text-primary hover:underline">
						&larr; All champions
					</Link>
					<h2 className="text-2xl font-bold text-foreground">{champion.name}</h2>
					<p className="text-sm text-muted-foreground">
						{gameName}#{tagLine}
						{mastery && ` · ${formatPoints(mastery.championPoints)} mastery pts`}
					</p>
				</div>
			</HeroBanner>
			<Panel>
				<ChampionSummary stat={stat} killParticipation={kp} />
			</Panel>
			<p className="text-xs text-muted-foreground">Games on {champion.name} that Summon.gg has stored for this player, newest first.</p>
			<MatchList
				matches={matches}
				puuid={puuid}
				version={version}
				isLoading={isLoading}
				runeData={runeData}
				lpHistories={lpHistories}
			/>
		</div>
	);
}
