import { cn } from "@/lib/utils";
import { lpChangeLabel, rankLabel, showsPart } from "@/lib/widget/format";
import { Emblem, recordLabel, RiotIdLine, tierColor, WinLoss, type WidgetViewProps } from "./widget-parts";
import styles from "./widget.module.css";

const MAX_DOTS = 10;

export function WidgetSquare({ data, options }: WidgetViewProps) {
	const lp = data.scope === "session" && showsPart(options.style, options.show, "lp");
	return (
		<>
			<RiotIdLine data={data} options={options} />
			<Emblem data={data} />
			<div className={styles.rank} style={{ color: tierColor(data) }}>
				{rankLabel(data.rank)} {data.rank && <span>· {data.rank.leaguePoints} LP</span>}
			</div>
			<div className={styles.split} style={lp ? undefined : { gridTemplateColumns: "1fr" }}>
				<div>
					<span className={styles.k}>{recordLabel(data)}</span>
					<span className={styles.v}>
						<WinLoss {...data.record} options={options} />
					</span>
				</div>
				{lp && (
					<div>
						<span className={styles.k}>LP today</span>
						<span className={cn(styles.v, data.lpChange !== null && (data.lpChange < 0 ? styles.down : styles.up))}>
							{data.lpChange === null ? <span className={styles.muted}>—</span> : lpChangeLabel(data.lpChange)}
						</span>
					</div>
				)}
			</div>
			<div className={styles.dots}>
				{data.games.slice(-MAX_DOTS).reverse().map((g) => (
					<i key={g.matchId} className={g.win ? styles.dotWin : undefined} />
				))}
			</div>
		</>
	);
}
