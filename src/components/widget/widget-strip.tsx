import { getChampionIcon } from "@/lib/game/icon-helpers";
import { cn } from "@/lib/utils";
import { rankLabel } from "@/lib/widget/format";
import { LiveClock } from "./widget-motion";
import { Emblem, LpChange, RiotIdLine, StreakChip, tierColor, WinLoss, type WidgetViewProps } from "./widget-parts";
import styles from "./widget.module.css";

const MAX_GAMES = 8;

export function WidgetStrip({ data, options, version, events }: WidgetViewProps) {
	// Newest first, the live game leading
	const games = data.games.slice(-(data.liveChampion ? MAX_GAMES - 1 : MAX_GAMES)).reverse();
	const fresh = new Set(events?.newGames);
	return (
		<>
			<div className={styles.head}>
				<Emblem data={data} options={options} events={events} />
				<div>
					<RiotIdLine data={data} options={options} />
					<div className={styles.rank} style={{ color: tierColor(data) }}>
						{rankLabel(data.rank)}
						{data.rank && ` · ${data.rank.leaguePoints} LP`}
					</div>
				</div>
				<div className={styles.sum}>
					<StreakChip data={data} />
					<WinLoss {...data.record} options={options} />
					<LpChange data={data} options={options} suffix=" LP" />
				</div>
			</div>
			{games.length === 0 && !data.liveChampion ? (
				<div className={styles.empty}>{data.scope === "season" ? "No ranked games yet" : "No games this session yet"}</div>
			) : (
				<div className={styles.games}>
					{data.liveChampion && (
						<div className={cn(styles.game, styles.live)}>
							<img src={getChampionIcon(version, data.liveChampion)} alt={data.liveChampion} />
							<svg className={styles.ants} viewBox="0 0 44 44" aria-hidden="true">
								<rect x="1" y="1" width="42" height="42" rx="8" />
							</svg>
							<LiveClock startedAt={data.liveStartedAt} />
						</div>
					)}
					{games.map((g) => (
						<div key={g.matchId} className={cn(styles.game, g.win && styles.gameWin, fresh.has(g.matchId) && styles.gameNew)}>
							<img src={getChampionIcon(version, g.championName)} alt={g.championName} />
							<span>
								{g.kills}/{g.deaths}/{g.assists}
							</span>
						</div>
					))}
				</div>
			)}
		</>
	);
}
