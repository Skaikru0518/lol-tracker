"use client";

import { useState } from "react";
import { GRADE_COLORS } from "@/lib/performance/grades";
import { type CategoryScore } from "@/lib/performance/score";
import { CATEGORY_LABELS } from "@/lib/performance/weights";
import { MetricTable } from "./metric-table";

export function CategoryCard({ category, roleLabel }: { category: CategoryScore; roleLabel: string }) {
	const [open, setOpen] = useState(false);
	const color = GRADE_COLORS[category.grade];
	return (
		<div className="rounded-md border p-3">
			<button type="button" onClick={() => setOpen((v) => !v)} className="w-full text-left">
				<div className="flex items-baseline justify-between">
					<span className="text-sm font-semibold text-foreground">{CATEGORY_LABELS[category.id]}</span>
					<span className="text-lg font-bold" style={{ color }}>
						{category.grade}
					</span>
				</div>
				<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
					<div className="h-full rounded-full" style={{ width: `${category.score}%`, backgroundColor: color }} />
				</div>
				<p className="mt-1 text-2xs text-muted-foreground">{category.score} / 100</p>
			</button>
			{open && (
				<div className="mt-2">
					<MetricTable metrics={category.metrics} roleLabel={roleLabel} />
				</div>
			)}
		</div>
	);
}
