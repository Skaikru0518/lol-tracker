"use client";

import { type Match } from "@/lib/validators/match";
import { getQueueName } from "@/lib/queue-names";
import MatchCard from "./match-card";
import { Skeleton } from "@/components/ui/skeleton";

interface MatchListProps {
	matches?: Match[];
	puuid: string;
	version?: string;
	isLoading?: boolean;
}

export function MatchList({
	matches,
	puuid,
	version,
	isLoading,
}: MatchListProps) {
	if (isLoading) {
		return (
			<div className="space-y-2">
				{Array.from({ length: 5 }).map((_, i) => (
					<Skeleton key={i} className="h-[68px] w-full rounded-xl" />
				))}
			</div>
		);
	}

	if (!matches || matches.length === 0) {
		return (
			<div className="flex h-40 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
				No matches found
			</div>
		);
	}

	return (
		<div className="space-y-2 flex flex-col">
			<h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				Recent Matches
			</h3>
			{matches.map((match, i) => {
				const player = match.info.participants.find((p) => p.puuid === puuid);
				if (!player) return null;

				return (
					<MatchCard
						key={match.metadata.matchId}
						matchId={match.metadata.matchId}
						player={player}
						queueName={getQueueName(match.info.queueId, match.info.gameMode)}
						gameDuration={match.info.gameDuration}
						gameCreation={match.info.gameCreation}
						version={version}
						index={i}
					/>
				);
			})}
		</div>
	);
}
