"use client";

import Link from "next/link";
import { useLiveGame } from "@/hooks/useLiveGame";
import { useNow } from "@/hooks/useNow";
import { formatDuration } from "@/lib/format";
import { getQueueName } from "@/lib/queue-names";
import { liveElapsedSeconds } from "@/lib/summoner/live-elapsed";

/** One-line banner shown while the player is in a game; links to the live page. */
export function LiveBanner({ puuid, basePath }: { puuid: string; basePath: string }) {
	const { data } = useLiveGame(puuid);
	const now = useNow();

	if (!data?.inGame) return null;

	const champSelect = !data.gameStartTime;
	const elapsed = liveElapsedSeconds(data.gameStartTime, data.gameLength, now);

	return (
		<Link
			href={`${basePath}/live`}
			className="mt-4 flex items-center gap-3 rounded-lg border border-loss/30 bg-card px-4 py-2.5 text-sm transition-colors hover:border-loss/60"
		>
			<span className="relative flex size-2.5">
				<span className="absolute inline-flex size-full animate-ping rounded-full bg-loss opacity-60" />
				<span className="relative inline-flex size-2.5 rounded-full bg-loss" />
			</span>
			<span className="font-bold text-loss">{champSelect ? "CHAMP SELECT" : "LIVE"}</span>
			{!champSelect && <span className="font-mono tabular-nums text-foreground">{formatDuration(elapsed)}</span>}
			{data.gameQueueConfigId !== undefined && (
				<span className="text-muted-foreground">{getQueueName(data.gameQueueConfigId)}</span>
			)}
			<span className="ml-auto font-medium text-primary">Watch live &rarr;</span>
		</Link>
	);
}
