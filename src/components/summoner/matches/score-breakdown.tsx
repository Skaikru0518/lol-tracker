"use client";

import { useMatchPerformance } from "@/hooks/usePerformance";
import { GRADE_COLORS } from "@/lib/performance/grades";
import { ROLE_LABELS } from "@/lib/performance/roles";
import { CATEGORY_LABELS } from "@/lib/performance/weights";

/** Hover detail of a match row's score; tooltip content mounts on hover, so the full score is only fetched then. */
export function ScoreBreakdown({ matchId, puuid }: { matchId: string; puuid: string }) {
	const { data, isLoading } = useMatchPerformance(matchId);
	const score = data?.[puuid];
	if (!score) return <span>{isLoading ? "Loading breakdown…" : "Performance score"}</span>;

	return (
		<div className="grid gap-1.5">
			<div>
				<p className="text-sm font-semibold">
					Performance score {score.score} · {score.grade}
				</p>
				<p className="opacity-60">{ROLE_LABELS[score.role]}, weighted by role</p>
			</div>
			<div className="grid grid-cols-2 gap-x-5 gap-y-0.5">
				{score.categories.map((c) => (
					<div key={c.id} className="flex justify-between gap-3">
						<span>{CATEGORY_LABELS[c.id]}</span>
						<span className="font-semibold tabular-nums" style={{ color: GRADE_COLORS[c.grade] }}>
							{c.score}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
