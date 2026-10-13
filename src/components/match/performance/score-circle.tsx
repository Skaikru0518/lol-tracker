import { useId } from "react";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { GRADE_COLORS, type Grade } from "@/lib/performance/grades";
import { ringOffset } from "@/lib/ui/stat-ring";

const SIZES = {
	sm: { box: 36, stroke: 3, text: "text-xs", crown: "-top-2 size-3" },
	lg: { box: 80, stroke: 6, text: "text-2xl", crown: "-top-3.5 size-4.5" },
};

export function ScoreCircle({ score, grade, size = "sm", className }: { score: number; grade: Grade; size?: "sm" | "lg"; className?: string }) {
	const gradientId = useId();
	const { box, stroke, text, crown } = SIZES[size];
	const color = GRADE_COLORS[grade];
	const radius = (box - stroke) / 2;
	const circumference = 2 * Math.PI * radius;
	const top = grade === "S+";
	const glow = top || grade === "S" ? `drop-shadow(0 0 ${size === "sm" ? 4 : 9}px ${color}99)` : undefined;

	return (
		<div title={`Performance ${score} · ${grade}`} className={cn("relative shrink-0", size === "sm" ? "size-9" : "size-20", className)} style={{ filter: glow }}>
			{top && <Crown className={cn("absolute left-1/2 -translate-x-1/2 fill-current", crown)} style={{ color }} />}
			<svg viewBox={`0 0 ${box} ${box}`} className="size-full -rotate-90">
				{top && (
					<defs>
						<linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
							<stop offset="0" stopColor="#fff3c4" />
							<stop offset="0.5" stopColor={color} />
							<stop offset="1" stopColor="#c98a12" />
						</linearGradient>
					</defs>
				)}
				<circle cx={box / 2} cy={box / 2} r={radius} fill={`${color}14`} stroke="var(--border)" strokeWidth={stroke} />
				<circle
					cx={box / 2}
					cy={box / 2}
					r={radius}
					fill="none"
					stroke={top ? `url(#${gradientId})` : color}
					strokeWidth={stroke}
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={ringOffset(score, 100, circumference)}
				/>
				{top && (
					<circle
						cx={box / 2}
						cy={box / 2}
						r={radius}
						fill="none"
						stroke="#fff"
						strokeOpacity={0.7}
						strokeWidth={stroke}
						strokeLinecap="round"
						strokeDasharray={`${circumference * 0.06} ${circumference}`}
						className="origin-center [transform-box:fill-box] motion-safe:animate-[spin_3s_linear_infinite]"
					/>
				)}
			</svg>
			<span className={cn("absolute inset-0 flex flex-col items-center justify-center font-extrabold", text, "leading-none")} style={{ color }}>
				{score}
				{size === "lg" && <span className="mt-0.5 text-xs font-bold opacity-85">{grade}</span>}
			</span>
		</div>
	);
}

export function ScorePlaceholder() {
	return (
		<div title="No performance score for this game" className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 text-xs text-muted-foreground">
			—
		</div>
	);
}
