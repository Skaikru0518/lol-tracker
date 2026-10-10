"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSummonerContext } from "@/components/summoner/shell/summoner-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useChampions } from "@/hooks/useChampions";
import { useLiveGame } from "@/hooks/useLiveGame";
import { usePlayerRanks } from "@/hooks/usePlayerRanks";
import { useRunes } from "@/hooks/useRunes";
import { liveViewState } from "@/lib/live/live-game";
import { queryFailed } from "@/lib/shared/query-state";
import { LiveHero } from "./live-hero";
import { LiveScoreboard } from "./live-scoreboard";

/** Live page: hero with timer and the mirrored 5v5, or an empty state with a link back when the player is not in a game. */
export function LiveGame() {
	const { puuid, gameName, tagLine, basePath, version } = useSummonerContext();
	const { data: live, isLoading, isError } = useLiveGame(puuid);
	const { data: champions } = useChampions();
	const { data: runeData } = useRunes();
	const puuids = useMemo(() => live?.participants?.map((p) => p.puuid), [live?.participants]);
	const { data: ranks, isLoading: ranksLoading, isError: ranksError } = usePlayerRanks(puuids);
	const ranksFailed = queryFailed({ isError: ranksError, data: ranks });

	const view = liveViewState({ data: live, isLoading, isError });

	if (view === "loading") {
		return (
			<div className="space-y-4">
				<Skeleton className="h-36" />
				<Skeleton className="h-80" />
			</div>
		);
	}

	if (view !== "live" || !live?.participants) {
		return (
			<Panel>
				<EmptyState
					title={view === "error" ? "Live game unavailable" : "Not in a game right now"}
					description={view === "error" ? "Riot could not be reached. Try again in a minute." : `${gameName}#${tagLine} is not playing at the moment.`}
					action={
						<Link href={basePath} className="text-sm font-medium text-primary hover:underline">
							&larr; Back to profile
						</Link>
					}
				/>
			</Panel>
		);
	}

	const me = live.participants.find((p) => p.puuid === puuid);
	const championName = me ? champions?.[me.championId]?.id : undefined;

	return (
		<TooltipProvider delayDuration={200}>
			<div className="space-y-4">
				<LiveHero game={live} championName={championName} playerLabel={`${gameName}#${tagLine}`} />
				<LiveScoreboard
					game={{ participants: live.participants, bannedChampions: live.bannedChampions ?? [], gameQueueConfigId: live.gameQueueConfigId ?? 0 }}
					version={version}
					champions={champions}
					runeData={runeData}
					ranks={ranks}
					ranksLoading={ranksLoading}
					ranksFailed={ranksFailed}
					highlightPuuid={puuid}
				/>
			</div>
		</TooltipProvider>
	);
}
