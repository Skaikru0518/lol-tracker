import { rankLabel } from "@/lib/widget/format";
import { Rotator } from "./widget-motion";
import { Emblem, LpChange, RecordCaption, RiotIdLine, StreakChip, tierColor, WinLoss, type WidgetViewProps } from "./widget-parts";
import styles from "./widget.module.css";

export function WidgetBar({ data, options, events }: WidgetViewProps) {
	const record = (
		<>
			<span className={styles.khead}>
				<StreakChip data={data} />
				<RecordCaption data={data} />
			</span>
			<span className={styles.wl}>
				<WinLoss {...data.record} options={options} />
			</span>
			<LpChange data={data} options={options} suffix=" LP" />
		</>
	);
	const rotate = options.fx.includes("rotate") && data.scope === "session" && data.season;

	return (
		<>
			<Emblem data={data} options={options} events={events} />
			<div className={styles.id}>
				<RiotIdLine data={data} options={options} />
				<div className={styles.rank} style={{ color: tierColor(data) }}>
					{rankLabel(data.rank)} {data.rank && <span>· {data.rank.leaguePoints} LP</span>}
				</div>
			</div>
			<div className={styles.sess}>
				{rotate && data.season ? (
					<Rotator>
						{[
							<div key="session">{record}</div>,
							<div key="season">
								<RecordCaption data={data} label="Season" />
								<span className={styles.wl}>
									<WinLoss {...data.season} options={options} />
								</span>
							</div>,
						]}
					</Rotator>
				) : (
					record
				)}
			</div>
		</>
	);
}
