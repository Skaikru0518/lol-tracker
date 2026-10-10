import { cn } from "@/lib/utils";
import { BansRow } from "@/components/shared/scoreboard/bans-row";
import { Panel } from "@/components/ui/panel";
import { type Champion, RANK_COLORS } from "@/lib/icon-helpers";
import { playerRankSummary, splitTeams, teamAvgRank } from "@/lib/live/live-game";
import { formatRankLabel } from "@/lib/rank-calculator";
import { type RuneMaps } from "@/lib/summoner/match-row";
import { type LiveGame } from "@/lib/validators/live-game";
import { type RankedEntry } from "@/lib/validators/ranked";
import { LiveRow } from "./live-row";

function TeamLabel({ side, avg }: { side: "blue" | "red"; avg: { tier: string; rank: string } | null }) {
	return (
		<span className={cn("flex items-center gap-2 text-xs", side === "red" && "flex-row-reverse")}>
			<span className={cn("font-bold", side === "blue" ? "text-team-blue" : "text-team-red")}>{side.toUpperCase()}</span>
			{avg && (
				<span className="text-muted-foreground">
					avg <span style={{ color: RANK_COLORS[avg.tier] }}>{formatRankLabel(avg.tier, avg.rank)}</span>
				</span>
			)}
		</span>
	);
}

/** Mirrored 5v5 of a live game with each team's average rank on top and the bans below. */
export function LiveScoreboard({
	game,
	version,
	champions,
	runeData,
	ranks,
	ranksLoading,
	highlightPuuid,
}: {
	game: Pick<LiveGame, "participants" | "bannedChampions" | "gameQueueConfigId">;
	version: string;
	champions?: Record<number, Champion>;
	runeData?: RuneMaps;
	ranks?: Record<string, RankedEntry[]>;
	ranksLoading: boolean;
	highlightPuuid: string;
}) {
	const { rows, blue, red } = splitTeams(game.participants);
	const queueId = game.gameQueueConfigId;
	const bans = (teamId: number) => game.bannedChampions.filter((b) => b.teamId === teamId && b.championId > 0).map((b) => b.championId);
	const row = (p: (typeof rows)[number]["blue"], side: "blue" | "red") => (
		<LiveRow
			key={p?.puuid ?? `${side}-empty`}
			participant={p}
			side={side}
			version={version}
			champions={champions}
			runeData={runeData}
			rank={p ? playerRankSummary(ranks?.[p.puuid], queueId) : null}
			ranksLoading={ranksLoading}
			highlighted={!!p && p.puuid === highlightPuuid}
		/>
	);

	return (
		<Panel>
			<div className="flex items-center justify-between border-b px-3 py-2">
				<TeamLabel side="blue" avg={teamAvgRank(blue, ranks, queueId)} />
				<TeamLabel side="red" avg={teamAvgRank(red, ranks, queueId)} />
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2">
				<div className="divide-y divide-border/50">{rows.map((r) => row(r.blue, "blue"))}</div>
				<div className="divide-y divide-border/50 border-t md:border-l md:border-t-0">{rows.map((r) => row(r.red, "red"))}</div>
			</div>
			<BansRow blueBans={bans(100)} redBans={bans(200)} version={version} champions={champions} />
		</Panel>
	);
}
