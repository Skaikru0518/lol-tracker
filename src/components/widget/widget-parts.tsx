import { getRankEmblem, RANK_COLORS } from "@/lib/game/icon-helpers";
import { PLATFORMS } from "@/lib/game/platforms";
import { type WidgetData, type WidgetOptions } from "@/lib/validators/widget";
import { lpChangeLabel, showsPart, winRateLabel } from "@/lib/widget/format";
import styles from "./widget.module.css";

export interface WidgetViewProps {
	data: WidgetData;
	options: WidgetOptions;
	version: string;
}

export function sessionRecord(data: WidgetData) {
	const wins = data.games.filter((g) => g.win).length;
	return { wins, losses: data.games.length - wins };
}

export function tierColor(data: WidgetData): string | undefined {
	return data.rank ? RANK_COLORS[data.rank.tier] : undefined;
}

export function Emblem({ data }: { data: WidgetData }) {
	return <img className={styles.emblem} src={getRankEmblem(data.rank?.tier)} alt="" />;
}

export function RiotIdLine({ data, options }: { data: WidgetData; options: WidgetOptions }) {
	const id = showsPart(options.style, options.show, "id");
	const server = showsPart(options.style, options.show, "server");
	if (!id && !server) return null;
	return (
		<div className={styles.name}>
			{id && (
				<span>
					{data.gameName} <span className={styles.tag}>#{data.tagLine}</span>
				</span>
			)}
			{server && <span className={styles.srv}>{PLATFORMS[data.platform].label}</span>}
		</div>
	);
}

export function WinLoss({ wins, losses, options }: { wins: number; losses: number; options: WidgetOptions }) {
	const rate = showsPart(options.style, options.show, "wr") ? winRateLabel(wins, losses) : null;
	return (
		<span>
			<span className={styles.win}>{wins}W</span> <span className={styles.loss}>{losses}L</span>
			{rate && <span className={styles.rate}> {rate}</span>}
		</span>
	);
}

export function LpChange({ data, options, suffix = "" }: { data: WidgetData; options: WidgetOptions; suffix?: string }) {
	if (data.lpChange === null || !showsPart(options.style, options.show, "lp")) return null;
	return (
		<span className={data.lpChange < 0 ? styles.down : styles.up}>
			{lpChangeLabel(data.lpChange)}
			{suffix}
		</span>
	);
}
