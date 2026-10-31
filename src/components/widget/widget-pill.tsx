import { shortRank } from "@/lib/widget/format";
import { Emblem, LpChange, tierColor, WinLoss, type WidgetViewProps } from "./widget-parts";
import styles from "./widget.module.css";

export function WidgetPill({ data, options }: WidgetViewProps) {
	return (
		<>
			<Emblem data={data} />
			<span style={{ color: tierColor(data) }}>{shortRank(data.rank)}</span>
			{data.rank && <span>{data.rank.leaguePoints} LP</span>}
			<span className={styles.sep} />
			<WinLoss {...data.record} options={options} />
			<LpChange data={data} options={options} />
		</>
	);
}
