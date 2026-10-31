import { rankLabel } from "@/lib/widget/format";
import { Emblem, LpChange, recordLabel, RiotIdLine, tierColor, WinLoss, type WidgetViewProps } from "./widget-parts";
import styles from "./widget.module.css";

export function WidgetBar({ data, options }: WidgetViewProps) {
	return (
		<>
			<Emblem data={data} />
			<div className={styles.id}>
				<RiotIdLine data={data} options={options} />
				<div className={styles.rank} style={{ color: tierColor(data) }}>
					{rankLabel(data.rank)} {data.rank && <span>· {data.rank.leaguePoints} LP</span>}
				</div>
			</div>
			<div className={styles.sess}>
				<span className={styles.k}>{recordLabel(data)}</span>
				<span className={styles.wl}>
					<WinLoss {...data.record} options={options} />
				</span>
				<LpChange data={data} options={options} suffix=" LP" />
			</div>
		</>
	);
}
