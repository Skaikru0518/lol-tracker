import { shortRank } from "@/lib/widget/format";
import { Emblem, LpChange, sessionRecord, tierColor, WinLoss, type WidgetViewProps } from "./widget-parts";
import styles from "./widget.module.css";

export function WidgetPill({ data, options }: WidgetViewProps) {
	const { wins, losses } = sessionRecord(data);
	return (
		<>
			<Emblem data={data} />
			<span style={{ color: tierColor(data) }}>{shortRank(data.rank)}</span>
			{data.rank && <span>{data.rank.leaguePoints} LP</span>}
			<span className={styles.sep} />
			<WinLoss wins={wins} losses={losses} options={options} />
			<LpChange data={data} options={options} />
		</>
	);
}
