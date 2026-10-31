import { cn } from "@/lib/utils";
import { WidgetBar } from "./widget-bar";
import { type WidgetViewProps } from "./widget-parts";
import { WidgetPill } from "./widget-pill";
import { WidgetSquare } from "./widget-square";
import { WidgetStrip } from "./widget-strip";
import styles from "./widget.module.css";

const VIEWS = { bar: WidgetBar, square: WidgetSquare, strip: WidgetStrip, pill: WidgetPill };

export function StreamWidget(props: WidgetViewProps) {
	const View = VIEWS[props.options.style];
	return (
		<div className={cn(styles.wg, styles[props.options.theme], styles[props.options.style])}>
			<View {...props} />
		</div>
	);
}

export function WidgetNotFound({ theme }: { theme: WidgetViewProps["options"]["theme"] }) {
	return <div className={cn(styles.wg, styles[theme], styles.notFound)}>Summoner not found</div>;
}
