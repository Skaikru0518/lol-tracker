import { cn } from "@/lib/utils";
import { ringOffset } from "@/lib/ui/stat-ring";

const SIZE = 64;
const STROKE = 5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Circular progress ring with a label and a centered value. */
export function StatRing({
	label,
	value,
	max = 100,
	display,
	color = "var(--primary)",
	className,
}: {
	label: string;
	value: number;
	max?: number;
	display: React.ReactNode;
	color?: string;
	className?: string;
}) {
	return (
		<div className={cn("flex flex-col items-center gap-1.5", className)}>
			<span className="text-xs font-medium text-muted-foreground">{label}</span>
			<div className="relative size-16">
				<svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full -rotate-90">
					<circle
						cx={SIZE / 2}
						cy={SIZE / 2}
						r={RADIUS}
						fill="none"
						stroke="var(--border)"
						strokeWidth={STROKE}
					/>
					<circle
						cx={SIZE / 2}
						cy={SIZE / 2}
						r={RADIUS}
						fill="none"
						stroke={color}
						strokeWidth={STROKE}
						strokeLinecap="round"
						strokeDasharray={CIRCUMFERENCE}
						strokeDashoffset={ringOffset(value, max, CIRCUMFERENCE)}
					/>
				</svg>
				<span className="absolute inset-0 grid place-items-center text-sm font-bold text-foreground">
					{display}
				</span>
			</div>
		</div>
	);
}
