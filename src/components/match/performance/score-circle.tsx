import { cn } from "@/lib/utils";
import { GRADE_COLORS, type Grade } from "@/lib/performance/grades";

export function ScoreCircle({ score, grade, size = "sm", className }: { score: number; grade: Grade; size?: "sm" | "lg"; className?: string }) {
	const color = GRADE_COLORS[grade];
	return (
		<div
			title={`Performance ${score} · ${grade}`}
			className={cn("flex shrink-0 items-center justify-center rounded-full border-2 font-bold", size === "sm" ? "size-9 text-xs" : "size-20 text-2xl", className)}
			style={{ borderColor: color, color, backgroundColor: `${color}1a` }}
		>
			{score}
		</div>
	);
}
