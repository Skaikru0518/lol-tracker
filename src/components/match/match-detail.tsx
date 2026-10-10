"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MirroredScoreboard } from "@/components/shared/scoreboard/mirrored-scoreboard";
import { ArenaScoreboard } from "@/components/summoner/matches/arena-scoreboard";
import { useChampions } from "@/hooks/useChampions";
import { useDDragonVersion } from "@/hooks/useDDragonVersion";
import { useItems } from "@/hooks/useItems";
import { useMatch } from "@/hooks/useMatch";
import { useMatchBadgesBatch } from "@/hooks/useMatchBadges";
import { usePlayerRanks } from "@/hooks/usePlayerRanks";
import { useRunes } from "@/hooks/useRunes";
import { useTimeline } from "@/hooks/useTimeline";
import { isArenaMatch } from "@/lib/arena-helpers";
import { arenaPlacement, badgeIdsFor, defaultSelectedPuuid, findParticipant, matchResult, participantIdOf, timelineState } from "@/lib/match/detail";
import { calculateAvgRank } from "@/lib/rank-calculator";
import { rankedQueueForQueueId } from "@/lib/ranked-queues";
import { buildScoreboard } from "@/lib/summoner/scoreboard";
import { MatchHero } from "./match-hero";
import { PlayerSelector } from "./player-selector";
import { PlayerTabs } from "./player-tabs/player-tabs";
import { TeamCharts } from "./team-charts";

/** Match detail A: hero, mirrored scoreboard, team charts, player selector and player tabs; Arena gets hero plus leaderboard. */
export function MatchDetail({ matchId, puuid }: { matchId: string; puuid?: string }) {
	const { data: match, isLoading, isError } = useMatch(matchId);
	const { data: timeline, isLoading: timelineLoading } = useTimeline(matchId);
	const { data: version } = useDDragonVersion();
	const { data: runeData } = useRunes();
	const { data: itemNames } = useItems();
	const { data: champions } = useChampions();
	const puuids = useMemo(() => match?.info.participants.map((p) => p.puuid), [match]);
	const { data: ranks, isLoading: ranksLoading } = usePlayerRanks(puuids);
	const { data: badges } = useMatchBadgesBatch([matchId]);
	const [picked, setPicked] = useState<string | null>(null);

	if (isLoading || (!match && !isError) || !version) {
		return (
			<div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
				<Skeleton className="h-36" />
				<Skeleton className="h-96" />
			</div>
		);
	}
	if (!match) {
		return (
			<div className="mx-auto max-w-6xl px-4 py-6">
				<Panel>
					<EmptyState
						title="Match not found"
						description="It may be too old or Riot could not be reached."
						action={
							<Link href="/" className="text-sm font-medium text-primary hover:underline">
								Back to search
							</Link>
						}
					/>
				</Panel>
			</div>
		);
	}

	const arena = isArenaMatch(match.info.queueId);
	const searched = findParticipant(match, puuid);
	const result = searched && !arena ? matchResult(match, searched) : null;
	const placement = searched && arena ? arenaPlacement(searched) : null;
	const tlState = timelineState({ data: timeline, isLoading: timelineLoading });
	const avgRank = calculateAvgRank(ranks, match.info.queueId);
	const selected = picked ?? defaultSelectedPuuid(match, puuid);
	const player = findParticipant(match, selected);
	const participantId = participantIdOf(match, selected);
	const badgeIds = badgeIdsFor(badges?.[matchId], selected);
	const hero = <MatchHero match={match} player={searched} result={result} placement={placement} avgRank={avgRank} />;

	if (arena) {
		return (
			<TooltipProvider delayDuration={200}>
				<div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
					{hero}
					<Panel>
						<ArenaScoreboard participants={match.info.participants} version={version} highlightPuuid={puuid ?? ""} badges={badges?.[matchId]} showItems />
					</Panel>
				</div>
			</TooltipProvider>
		);
	}

	return (
		<TooltipProvider delayDuration={200}>
			<div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
				{hero}
				<Panel>
					<MirroredScoreboard
						data={buildScoreboard(match)}
						version={version}
						highlightPuuid={puuid}
						ranks={ranks}
						ranksLoading={ranksLoading}
						runeData={runeData}
						itemNames={itemNames}
						rankQueue={rankedQueueForQueueId(match.info.queueId) ?? "RANKED_SOLO_5x5"}
						champions={champions}
					/>
				</Panel>
				<TeamCharts match={match} version={version} timeline={timeline} timelineState={tlState} />
				<PlayerSelector match={match} version={version} selected={selected} onSelect={setPicked} />
				{player && participantId !== null && (
					<PlayerTabs
						match={match}
						timeline={timeline}
						timelineState={tlState}
						player={player}
						participantId={participantId}
						version={version}
						runeData={runeData}
						itemNames={itemNames}
						badgeIds={badgeIds}
					/>
				)}
			</div>
		</TooltipProvider>
	);
}
