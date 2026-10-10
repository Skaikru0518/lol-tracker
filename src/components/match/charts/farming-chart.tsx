"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatThousands } from "@/lib/format";
import { teamSeries } from "@/lib/match/timeline-events";
import { type Timeline } from "@/lib/validators/timeline";
import { TeamAreaChart } from "./team-area-chart";

const METRICS = [
	{ id: "cs", label: "CS" },
	{ id: "gold", label: "Gold" },
] as const;

/** Team CS or total gold over time, switched in the header. */
export function FarmingChart({ timeline }: { timeline: Timeline }) {
	const [metric, setMetric] = useState<"cs" | "gold">("cs");
	const data = useMemo(() => teamSeries(timeline, metric), [timeline, metric]);

	return (
		<TeamAreaChart
			title={metric === "cs" ? "CS over time" : "Gold over time"}
			data={data}
			format={metric === "gold" ? formatThousands : (v) => String(v)}
			actions={
				<div className="flex gap-1">
					{METRICS.map((m) => (
						<button
							key={m.id}
							type="button"
							onClick={() => setMetric(m.id)}
							aria-pressed={m.id === metric}
							className={cn(
								"h-6 rounded-md border px-2 text-xs font-medium transition-colors",
								m.id === metric ? "border-primary/50 bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground",
							)}
						>
							{m.label}
						</button>
					))}
				</div>
			}
		/>
	);
}
