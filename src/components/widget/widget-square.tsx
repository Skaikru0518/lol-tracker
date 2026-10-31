import { cn } from "@/lib/utils";
import { rankLabel, showsPart } from "@/lib/widget/format";
import { RollingNumber } from "./widget-motion";
import { Emblem, RecordCaption, RiotIdLine, StreakChip, tierColor, WinLoss, type WidgetViewProps } from "./widget-parts";
import styles from "./widget.module.css";

const MAX_DOTS = 10;

export function WidgetSquare({ data, options, events }: WidgetViewProps) {
	const lp = data.scope === "session" && showsPart(options.style, options.show, "lp");
	const fresh = new Set(events?.newGames);
	return (
		<>
			<RiotIdLine data={data} options={options} />
			<Emblem data={data} options={options} events={events} />
			<div className={styles.rank} style={{ color: tierColor(data) }}>
				{rankLabel(data.rank)} {data.rank && <span>· {data.rank.leaguePoints} LP</span>}
			</div>
			<StreakChip data={data} />
			<div className={styles.split} style={lp ? undefined : { gridTemplateColumns: "1fr" }}>
				<div>
					<RecordCaption data={data} />
					<span className={styles.v}>
						<WinLoss {...data.record} options={options} />
					</span>
				</div>
				{lp && (
					<div>
						<span className={styles.k}>LP today</span>
						<span className={cn(styles.v, data.lpChange !== null && (data.lpChange < 0 ? styles.down : styles.up))}>
							{data.lpChange === null ? (
								<span className={styles.muted}>—</span>
							) : (
								<RollingNumber value={data.lpChange} animate={options.anim === "on"} format="signed" />
							)}
						</span>
					</div>
				)}
			</div>
			<div className={styles.dots}>
				{data.games
					.slice(-MAX_DOTS)
					.reverse()
					.map((g) => (
						<i key={g.matchId} className={cn(g.win && styles.dotWin, fresh.has(g.matchId) && styles.dotNew)} />
					))}
			</div>
		</>
	);
}
