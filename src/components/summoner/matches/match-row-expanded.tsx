"use client";

import { useMemo } from "react";
import Link from "next/link";
import { MirroredScoreboard } from "@/components/shared/scoreboard/mirrored-scoreboard";
import { useChampions } from "@/hooks/useChampions";
import { usePlayerRanks } from "@/hooks/usePlayerRanks";
import { useItems } from "@/hooks/useItems";
import { useRunes } from "@/hooks/useRunes";
import { isArenaMatch } from "@/lib/game/arena-helpers";
import { buildScoreboard } from "@/lib/summoner/matches/scoreboard";
import { rankedQueueForQueueId } from "@/lib/game/ranked-queues";
import { type Match } from "@/lib/validators/match";
import { ArenaScoreboard } from "./arena-scoreboard";

/** Expanded match: mirrored 5v5 (ranks fetched on open) or the Arena leaderboard, plus a full-match link. */
export function MatchRowExpanded({
	match,
	puuid,
	version,
	badges,
}: {
	match: Match;
	puuid: string;
	version: string;
	badges?: { puuid: string; badgeId: string }[];
}) {
	const arena = isArenaMatch(match.info.queueId);
	const puuids = useMemo(() => (arena ? undefined : match.info.participants.map((p) => p.puuid)), [arena, match]);
	const { data: ranks, isLoading: ranksLoading } = usePlayerRanks(puuids);
	const { data: champions } = useChampions();
	const { data: runeData } = useRunes();
	const { data: itemNames } = useItems();
	const data = useMemo(() => buildScoreboard(match), [match]);

	const fullMatch = (
		<Link
			href={`/match/${match.metadata.matchId}?puuid=${puuid}`}
			onClick={(e) => e.stopPropagation()}
			className="font-medium text-primary hover:underline"
		>
			Full match &rarr;
		</Link>
	);

	if (arena) {
		return (
			<div className="border-t">
				<ArenaScoreboard participants={match.info.participants} version={version} highlightPuuid={puuid} />
				<div className="border-t px-3 py-2 text-center text-xs">{fullMatch}</div>
			</div>
		);
	}

	return (
		<div className="border-t">
			<MirroredScoreboard
				data={data}
				version={version}
				highlightPuuid={puuid}
				ranks={ranks}
				ranksLoading={ranksLoading}
				runeData={runeData}
				itemNames={itemNames}
				badges={badges}
				rankQueue={rankedQueueForQueueId(match.info.queueId) ?? "RANKED_SOLO_5x5"}
				champions={champions}
				footer={fullMatch}
			/>
		</div>
	);
}
