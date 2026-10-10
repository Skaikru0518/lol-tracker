"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type DailyLpPoint, dayKeyToDate, lpAxisTickLabel, lpAxisTicks } from "@/lib/lp-history/summary";
import { formatRankLabel } from "@/lib/rank-calculator";

const dayLabel = (day: string) => dayKeyToDate(day).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Step chart of absolute LP with one evenly spaced point per played day; tooltip shows that day's final rank. */
export function LpChart({ points }: { points: DailyLpPoint[] }) {
	const data = points.map((p) => ({
		day: p.day,
		value: p.value,
		label: `${formatRankLabel(p.snapshot.tier, p.snapshot.rank)} · ${p.snapshot.lp} LP`,
	}));
	const values = data.map((d) => d.value);
	const ticks = lpAxisTicks(Math.min(...values), Math.max(...values));

	return (
		<div className="h-64 px-2 pb-2 pt-4">
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart data={data} margin={{ left: 8, right: 8 }}>
					<defs>
						<linearGradient id="lp-fill" x1="0" x2="0" y1="0" y2="1">
							<stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
							<stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
						</linearGradient>
					</defs>
					<CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
					<XAxis dataKey="day" type="category" tickFormatter={dayLabel} minTickGap={16} stroke="var(--muted-foreground)" fontSize={11} />
					<YAxis domain={[ticks[0], ticks[ticks.length - 1]]} ticks={ticks} tickFormatter={lpAxisTickLabel} stroke="var(--muted-foreground)" fontSize={11} width={90} />
					<Tooltip
						contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
						labelFormatter={(day) => dayLabel(String(day))}
						formatter={(_value, _name, item) => [item.payload.label, "Rank"]}
					/>
					<Area type="stepAfter" dataKey="value" stroke="var(--primary)" strokeWidth={2} fill="url(#lp-fill)" />
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}
