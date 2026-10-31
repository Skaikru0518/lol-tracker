import { getRankEmblem, RANK_COLORS } from "@/lib/game/icon-helpers";
import { PLATFORMS } from "@/lib/game/platforms";
import { cn } from "@/lib/utils";
import { type WidgetData, type WidgetOptions } from "@/lib/validators/widget";
import { type WidgetEvents, trailingWinStreak } from "@/lib/widget/events";
import { lpChangeLabel, rankLabel, showsPart, winRate } from "@/lib/widget/format";
import { MarqueeText, RollingNumber } from "./widget-motion";
import styles from "./widget.module.css";

export const STREAK_MIN = 3;

export type WidgetEventsState = WidgetEvents & { nonce: number };

export interface WidgetViewProps {
	data: WidgetData;
	options: WidgetOptions;
	version: string;
	events?: WidgetEventsState | null;
}

export function recordLabel(data: WidgetData): string {
	return data.scope === "season" ? "Season" : "Session";
}

export function tierColor(data: WidgetData): string | undefined {
	return data.rank ? RANK_COLORS[data.rank.tier] : undefined;
}

export function winStreak(data: WidgetData): number {
	return trailingWinStreak(data.games);
}

export function Emblem({ data, options, events }: Pick<WidgetViewProps, "data" | "options" | "events">) {
	const src = getRankEmblem(data.rank?.tier);
	const rankKey = data.rank ? `${data.rank.tier}-${data.rank.division}` : "unranked";
	const motion = events?.rank === "up" ? styles.promo : events?.rank === "down" ? styles.demote : undefined;
	return (
		<span className={styles.embWrap}>
			{options.fx.includes("smoke") && (
				<>
					<img className={styles.vapor} src={src} alt="" />
					<img className={styles.vapor} src={src} alt="" />
				</>
			)}
			<img key={rankKey} className={cn(styles.emblem, motion)} src={src} alt="" />
			{events?.rank === "up" && (
				<>
					<span key={`b1-${events.nonce}`} className={styles.burst} />
					<span key={`b2-${events.nonce}`} className={styles.burst} />
				</>
			)}
		</span>
	);
}

export function RiotIdLine({ data, options }: { data: WidgetData; options: WidgetOptions }) {
	const id = showsPart(options.style, options.show, "id");
	const server = showsPart(options.style, options.show, "server");
	if (!id && !server) return null;
	return (
		<div className={styles.name}>
			{id && (
				<MarqueeText animate={options.anim === "on"}>
					{data.gameName} <span className={styles.tag}>#{data.tagLine}</span>
				</MarqueeText>
			)}
			{server && <span className={styles.srv}>{PLATFORMS[data.platform].label}</span>}
		</div>
	);
}

export function WinLoss({ wins, losses, options }: { wins: number; losses: number; options: WidgetOptions }) {
	const animate = options.anim === "on";
	const rate = showsPart(options.style, options.show, "wr") ? winRate(wins, losses) : null;
	return (
		<span>
			<span className={styles.win}>
				<RollingNumber value={wins} animate={animate} />W
			</span>{" "}
			<span className={styles.loss}>
				<RollingNumber value={losses} animate={animate} />L
			</span>
			{rate !== null && (
				<span className={styles.rate}>
					{" "}
					<RollingNumber value={rate} animate={animate} format="rate" />
				</span>
			)}
		</span>
	);
}

export function LpChange({ data, options, suffix = "" }: { data: WidgetData; options: WidgetOptions; suffix?: string }) {
	if (data.lpChange === null || data.scope === "season" || !showsPart(options.style, options.show, "lp")) return null;
	return (
		<span className={data.lpChange < 0 ? styles.down : styles.up}>
			<RollingNumber value={data.lpChange} animate={options.anim === "on"} format="signed" suffix={suffix} />
		</span>
	);
}

export function StreakChip({ data }: { data: WidgetData }) {
	const streak = winStreak(data);
	return streak >= STREAK_MIN ? <span className={styles.streak}>🔥 {streak}</span> : null;
}

export function RecordCaption({ data, label = recordLabel(data) }: { data: WidgetData; label?: string }) {
	return <span className={styles.k}>{label}</span>;
}

/** Flash, floating LP and the promotion/demotion cover for the latest refresh; keyed so each event replays. */
export function EventLayer({ data, events }: { data: WidgetData; events?: WidgetEventsState | null }) {
	if (!events) return null;
	const k = events.nonce;
	return (
		<>
			{events.result && <span key={`f${k}`} className={cn(styles.flash, events.result === "win" ? styles.flashWin : styles.flashLoss)} />}
			{events.lpDelta !== null && (
				<span key={`l${k}`} className={cn(styles.float, events.lpDelta < 0 ? styles.down : styles.up)}>
					{lpChangeLabel(events.lpDelta)} LP
				</span>
			)}
			{events.rank && (
				<span key={`c${k}`} className={cn(styles.cover, events.rank === "down" && styles.coverDown)}>
					<span className={styles.coverLabel}>{events.rank === "up" ? "PROMOTED" : "DEMOTED"}</span>
					<span className={styles.coverRank}>{rankLabel(data.rank)}</span>
				</span>
			)}
		</>
	);
}

export function Watermark() {
	return (
		<span className={styles.wm}>
			summon<b>.gg</b>
		</span>
	);
}

export function VaporFilter() {
	return (
		<svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
			<filter id="summon-vapor" x="-20%" y="-40%" width="140%" height="180%">
				<feTurbulence type="fractalNoise" baseFrequency="0.015 0.05" numOctaves={2} seed={3}>
					<animate attributeName="baseFrequency" dur="9s" values="0.015 0.05;0.02 0.07;0.015 0.05" repeatCount="indefinite" />
				</feTurbulence>
				<feDisplacementMap in="SourceGraphic" scale={14} xChannelSelector="R" yChannelSelector="G" />
			</filter>
		</svg>
	);
}
