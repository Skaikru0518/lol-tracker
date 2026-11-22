import Link from "next/link";
import { ScoreCircle, ScorePlaceholder } from "@/components/match/performance/score-circle";
import { RankEmblem } from "@/components/ui/rank-emblem";
import { formatRankLabel } from "@/lib/game/rank-calculator";
import { getSummonerIcon } from "@/lib/game/icon-helpers";
import { toSummonerSlug } from "@/lib/game/riot-id";
import { cn } from "@/lib/utils";
import { type DuoSidePayload } from "@/lib/validators/duo";

const FULL_SAMPLE = 30;

function Side({ side, version, linked, team }: { side: DuoSidePayload; version: string; linked: boolean; team: "blue" | "red" }) {
	const name = side.tagLine && linked ? (
		<Link href={`/summoner/${toSummonerSlug(side.gameName, side.tagLine)}`} className="hover:text-primary">
			{side.gameName}
		</Link>
	) : (
		side.gameName
	);
	return (
		<div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
			<img
				src={getSummonerIcon(version, side.profileIcon)}
				alt=""
				width={56}
				height={56}
				className={cn("size-14 rounded-xl ring-2", team === "blue" ? "ring-team-blue/70" : "ring-team-red/70")}
			/>
			<div className="w-full min-w-0 leading-tight">
				<p className="truncate text-sm font-bold text-foreground">{name}</p>
				{side.tagLine && <p className="truncate text-3xs text-muted-foreground">#{side.tagLine}</p>}
			</div>
			<p className="flex items-center gap-1 text-2xs text-muted-foreground">
				<RankEmblem tier={side.rank?.tier} size={18} />
				{side.rank ? `${formatRankLabel(side.rank.tier, side.rank.rank)} · ${side.rank.leaguePoints} LP` : "Unranked"}
			</p>
			{side.summary.score ? <ScoreCircle score={side.summary.score.average} grade={side.summary.score.grade} size="lg" /> : <ScorePlaceholder />}
			<p className="text-3xs text-muted-foreground">
				{side.summary.games < FULL_SAMPLE ? `${side.summary.games} stored games` : "avg score"}
			</p>
		</div>
	);
}

/** Both players facing each other, each with rank and average score over the last 30 stored ranked games. */
export function CompareHeader({ player, friend, version }: { player: DuoSidePayload; friend: DuoSidePayload; version: string }) {
	return (
		<div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 bg-gradient-to-r from-team-blue/10 via-transparent to-team-red/10 px-3 py-5 sm:gap-6 sm:px-8">
			<Side side={player} version={version} linked={false} team="blue" />
			<span className="text-lg font-black italic text-muted-foreground/70">VS</span>
			<Side side={friend} version={version} linked team="red" />
		</div>
	);
}
