import Link from "next/link";
import { cn } from "@/lib/utils";
import { HeroBanner } from "@/components/ui/hero-banner";
import { formatDuration } from "@/lib/shared/format";
import { getChampionSplash } from "@/lib/game/icon-helpers";
import { getPlacementColor, getPlacementSuffix } from "@/lib/game/arena-helpers";
import { type MatchResult } from "@/lib/match/detail";
import { getQueueName } from "@/lib/game/queue-names";
import { formatRankLabel } from "@/lib/game/rank-calculator";
import { toSummonerSlug } from "@/lib/game/riot-id";
import { type Match, type Participant } from "@/lib/validators/match";

const RESULT_TONE: Record<MatchResult, string> = {
	Victory: "text-win",
	Defeat: "text-loss",
	Remake: "text-muted-foreground",
};

/** Splash of the searched player's champion with queue, result (Arena: placement), duration, date and the average rank. */
export function MatchHero({
	match,
	player,
	result,
	placement = null,
	avgRank,
}: {
	match: Match;
	player: Participant | undefined;
	result: MatchResult | null;
	placement?: number | null;
	avgRank: { tier: string; rank: string } | null;
}) {
	const splashChampion = player?.championName ?? match.info.participants[0]?.championName;
	const date = new Date(match.info.gameCreation).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

	return (
		<HeroBanner splashUrl={splashChampion ? getChampionSplash(splashChampion) : null} className="rounded-lg border">
			<div className="flex min-h-36 flex-col justify-end gap-1 p-5">
				{player && (
					<Link
						href={`/summoner/${toSummonerSlug(player.riotIdGameName, player.riotIdTagline)}`}
						className="mb-auto text-xs font-medium text-primary hover:underline"
					>
						&larr; {player.riotIdGameName}#{player.riotIdTagline}
					</Link>
				)}
				<h1 className="text-2xl font-bold text-foreground">{getQueueName(match.info.queueId, match.info.gameMode)}</h1>
				<p className="text-sm text-muted-foreground">
					{result && <span className={cn("font-semibold", RESULT_TONE[result])}>{result} · </span>}
					{placement !== null && (
						<span className="font-semibold" style={{ color: getPlacementColor(placement) }}>
							{placement}
							{getPlacementSuffix(placement)} place ·{" "}
						</span>
					)}
					{formatDuration(match.info.gameDuration)} · {date}
					{avgRank && ` · Avg. ${formatRankLabel(avgRank.tier, avgRank.rank)}`}
				</p>
			</div>
		</HeroBanner>
	);
}
