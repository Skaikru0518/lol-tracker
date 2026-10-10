import { cn } from "@/lib/utils";
import { BansRow } from "@/components/shared/scoreboard/bans-row";
import { Panel } from "@/components/ui/panel";
import { type Champion, RANK_COLORS } from "@/lib/icon-helpers";
import { playerRankSummary, splitTeams, teamAvgRank } from "@/lib/live/live-game";
import { formatRankLabel } from "@/lib/rank-calculator";
import { type RuneMaps } from "@/lib/summoner/match-row";
import { type LiveGame, type LiveGameParticipant } from "@/lib/validators/live-game";
import { type RankedEntry } from "@/lib/validators/ranked";
import { LiveRow } from "./live-row";

function TeamLabel({ side, avg, className }: { side: "blue" | "red"; avg: { tier: string; rank: string } | null; className?: string }) {
	return (
		<span className={cn("flex items-center gap-2 text-xs", side === "red" && "flex-row-reverse", className)}>
			<span className={cn("font-bold", side === "blue" ? "text-team-blue" : "text-team-red")}>{side.toUpperCase()}</span>
			{avg && (
				<span className="text-muted-foreground">
					avg <span style={{ color: RANK_COLORS[avg.tier] }}>{formatRankLabel(avg.tier, avg.rank)}</span>
				</span>
			)}
		</span>
	);
}

/** Mirrored 5v5 of a live game with each team's average rank on top (above its own column on mobile) and the bans below. */
export function LiveScoreboard({
	game,
	version,
	champions,
	runeData,
	ranks,
	ranksLoading,
	ranksFailed = false,
	highlightPuuid,
}: {
	game: Pick<LiveGame, "participants" | "bannedChampions" | "gameQueueConfigId">;
	version: string;
	champions?: Record<number, Champion>;
	runeData?: RuneMaps;
	ranks?: Record<string, RankedEntry[]>;
	ranksLoading: boolean;
	ranksFailed?: boolean;
	highlightPuuid: string;
}) {
	const { rows, blue, red } = splitTeams(game.participants);
	const queueId = game.gameQueueConfigId;
	const avg = { blue: teamAvgRank(blue, ranks, queueId), red: teamAvgRank(red, ranks, queueId) };
	const bans = (teamId: number) => game.bannedChampions.filter((b) => b.teamId === teamId && b.championId > 0).map((b) => b.championId);
	const row = (p: LiveGameParticipant | null, side: "blue" | "red", index: number) => (
		<LiveRow
			key={`${side}-${index}`}
			participant={p}
			side={side}
			version={version}
			champions={champions}
			runeData={runeData}
			rank={p ? playerRankSummary(ranks?.[p.puuid], queueId) : null}
			ranksLoading={ranksLoading}
			ranksFailed={ranksFailed}
			highlighted={!!p && p.puuid === highlightPuuid}
		/>
	);
	const column = (side: "blue" | "red") => (
		<div className={cn("divide-y divide-border/50", side === "red" && "border-t md:border-l md:border-t-0")}>
			<div className="px-3 py-2 md:hidden">
				<TeamLabel side={side} avg={avg[side]} />
			</div>
			{rows.map((r, i) => row(r[side], side, i))}
		</div>
	);

	return (
		<Panel>
			<div className="hidden items-center justify-between border-b px-3 py-2 md:flex">
				<TeamLabel side="blue" avg={avg.blue} />
				<TeamLabel side="red" avg={avg.red} />
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2">
				{column("blue")}
				{column("red")}
			</div>
			<BansRow blueBans={bans(100)} redBans={bans(200)} version={version} champions={champions} />
		</Panel>
	);
}
