import { cn } from "@/lib/utils";
import { WidgetBar } from "./widget-bar";
import { EventLayer, STREAK_MIN, tierColor, VaporFilter, Watermark, winStreak, type WidgetViewProps } from "./widget-parts";
import { WidgetPill } from "./widget-pill";
import { WidgetSquare } from "./widget-square";
import { WidgetStrip } from "./widget-strip";
import styles from "./widget.module.css";

const VIEWS = { bar: WidgetBar, square: WidgetSquare, strip: WidgetStrip, pill: WidgetPill };

export function StreamWidget(props: WidgetViewProps) {
	const { data, options, events } = props;
	const View = VIEWS[options.style];
	return (
		<div
			className={cn(
				styles.wg,
				styles[options.theme],
				styles[options.style],
				options.anim === "on" ? styles.enter : styles.still,
				winStreak(data) >= STREAK_MIN && styles.onFire,
			)}
			style={{ "--tier": tierColor(data) ?? "#7d829c" } as React.CSSProperties}
		>
			{options.fx.includes("smoke") && <VaporFilter />}
			<View {...props} />
			{options.anim === "on" && <EventLayer data={data} events={events} />}
			{options.style !== "pill" && <Watermark />}
		</div>
	);
}

export function WidgetNotFound({ theme }: { theme: WidgetViewProps["options"]["theme"] }) {
	return <div className={cn(styles.wg, styles[theme], styles.notFound)}>Summoner not found</div>;
}
