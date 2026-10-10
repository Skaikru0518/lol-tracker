"use client";

import { HeroBanner } from "@/components/ui/hero-banner";
import { useNow } from "@/hooks/useNow";
import { formatDuration } from "@/lib/format";
import { getChampionSplash } from "@/lib/icon-helpers";
import { mapName } from "@/lib/live/live-game";
import { getQueueName } from "@/lib/queue-names";
import { liveElapsedSeconds } from "@/lib/summoner/live-elapsed";

/** The player's champion splash with a pulsing LIVE timer (or champ select), the queue and the map. */
export function LiveHero({
	game,
	championName,
	playerLabel,
}: {
	game: { gameStartTime?: number; gameLength?: number; gameQueueConfigId?: number; mapId?: number };
	championName: string | undefined;
	playerLabel: string;
}) {
	const now = useNow();
	const champSelect = !game.gameStartTime;
	const elapsed = liveElapsedSeconds(game.gameStartTime, game.gameLength, now);

	return (
		<HeroBanner splashUrl={championName ? getChampionSplash(championName) : null} className="rounded-lg border">
			<div className="flex min-h-36 flex-col justify-end gap-1 p-5">
				<p className="flex items-center gap-2 text-sm font-bold text-loss">
					<span className="relative flex size-2.5">
						<span className="absolute inline-flex size-full animate-ping rounded-full bg-loss opacity-60" />
						<span className="relative inline-flex size-2.5 rounded-full bg-loss" />
					</span>
					{champSelect ? "CHAMP SELECT" : "LIVE"}
					{!champSelect && <span className="font-mono tabular-nums text-foreground">{formatDuration(elapsed)}</span>}
				</p>
				<h1 className="text-2xl font-bold text-foreground">{getQueueName(game.gameQueueConfigId ?? 0)}</h1>
				<p className="text-sm text-muted-foreground">
					{playerLabel} · {mapName(game.mapId)}
				</p>
			</div>
		</HeroBanner>
	);
}
