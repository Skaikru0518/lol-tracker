import { GRADE_COLORS } from "@/lib/performance/grades";
import { CATEGORY_LABELS } from "@/lib/performance/weights";
import { type RecentSummaryPayload } from "@/lib/validators/performance";

export function CategoryBars({ categories }: { categories: RecentSummaryPayload["categories"] }) {
	return (
		<div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
			{categories.map((c) => (
				<div key={c.id}>
					<div className="flex items-baseline justify-between text-xs">
						<span className="text-muted-foreground">{CATEGORY_LABELS[c.id]}</span>
						<span className="font-semibold" style={{ color: GRADE_COLORS[c.grade] }}>
							{c.score} · {c.grade}
						</span>
					</div>
					<div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
						<div className="h-full rounded-full" style={{ width: `${c.score}%`, backgroundColor: GRADE_COLORS[c.grade] }} />
					</div>
				</div>
			))}
		</div>
	);
}
