import { type RuneMaps } from "@/lib/summoner/match-row";
import { type Champion } from "@/lib/icon-helpers";
import { type ScoreboardData } from "@/lib/summoner/scoreboard";
import { type RankedEntry } from "@/lib/validators/ranked";
import { BansRow } from "./bans-row";
import { ScoreboardRow } from "./scoreboard-row";
import { TeamHeader } from "./team-header";

/** LoG-style 5v5: blue left, red right, lane opponents face each other, bans at the bottom. */
export function MirroredScoreboard({
	data,
	version,
	highlightPuuid,
	ranks,
	rankQueue = "RANKED_SOLO_5x5",
	champions,
	footer,
	ranksLoading = false,
	runeData,
	itemNames,
}: {
	data: ScoreboardData;
	version: string;
	highlightPuuid?: string;
	ranks?: Record<string, RankedEntry[]>;
	rankQueue?: string;
	champions?: Record<number, Champion>;
	footer?: React.ReactNode;
	ranksLoading?: boolean;
	runeData?: RuneMaps;
	itemNames?: Map<number, string>;
}) {
	const rankOf = (puuid?: string) => (puuid ? ranks?.[puuid]?.find((e) => e.queueType === rankQueue) : undefined);

	return (
		<div className="bg-background/40">
			<div className="flex items-start justify-between gap-4 border-b px-3 py-2">
				<TeamHeader team={data.blue} side="blue" remake={data.remake} />
				<TeamHeader team={data.red} side="red" remake={data.remake} />
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2">
				<div className="divide-y divide-border/50">
					{data.rows.map((row, i) => (
						<ScoreboardRow
							key={row.blue?.puuid ?? `b${i}`}
							participant={row.blue}
							side="blue"
							version={version}
							highlighted={!!row.blue && row.blue.puuid === highlightPuuid}
							rank={rankOf(row.blue?.puuid)}
							ranksLoading={ranksLoading}
							runeData={runeData}
							itemNames={itemNames}
						/>
					))}
				</div>
				<div className="divide-y divide-border/50 border-t md:border-l md:border-t-0">
					{data.rows.map((row, i) => (
						<ScoreboardRow
							key={row.red?.puuid ?? `r${i}`}
							participant={row.red}
							side="red"
							version={version}
							highlighted={!!row.red && row.red.puuid === highlightPuuid}
							rank={rankOf(row.red?.puuid)}
							ranksLoading={ranksLoading}
							runeData={runeData}
							itemNames={itemNames}
						/>
					))}
				</div>
			</div>
			<BansRow blueBans={data.blue.bans} redBans={data.red.bans} version={version} champions={champions}>
				{footer}
			</BansRow>
		</div>
	);
}
