import Link from "next/link";
import { ScoreCircle, ScorePlaceholder } from "@/components/match/performance/score-circle";
import { formatRankLabel } from "@/lib/game/rank-calculator";
import { getSummonerIcon } from "@/lib/game/icon-helpers";
import { toSummonerSlug } from "@/lib/game/riot-id";
import { cn } from "@/lib/utils";
import { type DuoSidePayload } from "@/lib/validators/duo";

const FULL_SAMPLE = 30;

function Side({ side, version, linked, align }: { side: DuoSidePayload; version: string; linked: boolean; align: "left" | "right" }) {
	const name = (
		<>
			{side.gameName}
			{side.tagLine && <span className="ml-1 text-muted-foreground">#{side.tagLine}</span>}
		</>
	);
	return (
		<div className={cn("flex min-w-0 flex-1 items-center gap-2.5", align === "right" && "flex-row-reverse text-right")}>
			<img src={getSummonerIcon(version, side.profileIcon)} alt="" width={40} height={40} className="size-10 shrink-0 rounded-md" />
			<div className="min-w-0 leading-tight">
				<p className="truncate text-sm font-semibold text-foreground">
					{linked && side.tagLine ? (
						<Link href={`/summoner/${toSummonerSlug(side.gameName, side.tagLine)}`} className="hover:text-primary">
							{name}
						</Link>
					) : (
						name
					)}
				</p>
				<p className="text-2xs text-muted-foreground">{side.rank ? `${formatRankLabel(side.rank.tier, side.rank.rank)} · ${side.rank.leaguePoints} LP` : "Unranked"}</p>
				{side.summary.games < FULL_SAMPLE && <p className="text-3xs text-muted-foreground">{side.summary.games} stored games</p>}
			</div>
		</div>
	);
}

/** Both players facing each other with their average score over the last 30 stored ranked games. */
export function CompareHeader({ player, friend, version }: { player: DuoSidePayload; friend: DuoSidePayload; version: string }) {
	const score = (side: DuoSidePayload) => (side.summary.score ? <ScoreCircle score={side.summary.score.average} grade={side.summary.score.grade} /> : <ScorePlaceholder />);
	return (
		<div className="flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
			<Side side={player} version={version} linked={false} align="left" />
			{score(player)}
			<span className="shrink-0 text-xs font-bold text-muted-foreground">VS</span>
			{score(friend)}
			<Side side={friend} version={version} linked align="right" />
		</div>
	);
}
