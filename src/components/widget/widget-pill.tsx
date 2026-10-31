import { shortRank } from "@/lib/widget/format";
import { Rotator } from "./widget-motion";
import { Emblem, LpChange, StreakChip, tierColor, Watermark, WinLoss, type WidgetViewProps } from "./widget-parts";
import styles from "./widget.module.css";

export function WidgetPill({ data, options, events }: WidgetViewProps) {
	const rank = (
		<>
			<span style={{ color: tierColor(data) }}>{shortRank(data.rank)}</span>
			{data.rank && <span>{data.rank.leaguePoints} LP</span>}
		</>
	);
	const record = (
		<>
			<StreakChip data={data} />
			<WinLoss {...data.record} options={options} />
			<LpChange data={data} options={options} />
		</>
	);
	return (
		<>
			<Emblem data={data} options={options} events={events} />
			{options.fx.includes("rotate") ? (
				<Rotator>
					{[<span key="rank">{rank}</span>, <span key="record">{record}</span>]}
				</Rotator>
			) : (
				<>
					{rank}
					<span className={styles.sep} />
					{record}
				</>
			)}
			<Watermark />
		</>
	);
}
