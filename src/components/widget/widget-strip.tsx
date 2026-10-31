import { getChampionIcon } from "@/lib/game/icon-helpers";
import { cn } from "@/lib/utils";
import { rankLabel } from "@/lib/widget/format";
import { Emblem, LpChange, RiotIdLine, sessionRecord, tierColor, WinLoss, type WidgetViewProps } from "./widget-parts";
import styles from "./widget.module.css";

const MAX_GAMES = 8;

export function WidgetStrip({ data, options, version }: WidgetViewProps) {
	const { wins, losses } = sessionRecord(data);
	const games = data.games.slice(-(data.liveChampion ? MAX_GAMES - 1 : MAX_GAMES));
	return (
		<>
			<div className={styles.head}>
				<Emblem data={data} />
				<div>
					<RiotIdLine data={data} options={options} />
					<div className={styles.rank} style={{ color: tierColor(data) }}>
						{rankLabel(data.rank)}
						{data.rank && ` · ${data.rank.leaguePoints} LP`}
					</div>
				</div>
				<div className={styles.sum}>
					<WinLoss wins={wins} losses={losses} options={options} />
					<LpChange data={data} options={options} suffix=" LP" />
				</div>
			</div>
			{games.length === 0 && !data.liveChampion ? (
				<div className={styles.empty}>No games this session yet</div>
			) : (
				<div className={styles.games}>
					{games.map((g) => (
						<div key={g.matchId} className={cn(styles.game, g.win && styles.gameWin)}>
							<img src={getChampionIcon(version, g.championName)} alt={g.championName} />
							<span>
								{g.kills}/{g.deaths}/{g.assists}
							</span>
						</div>
					))}
					{data.liveChampion && (
						<div className={cn(styles.game, styles.live)}>
							<img src={getChampionIcon(version, data.liveChampion)} alt={data.liveChampion} />
							<span>Live</span>
						</div>
					)}
				</div>
			)}
		</>
	);
}
