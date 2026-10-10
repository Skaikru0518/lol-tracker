"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { lpAxisTickLabel, lpAxisTicks } from "@/lib/lp-history/summary";
import { formatRankLabel } from "@/lib/rank-calculator";
import { toAbsoluteLp } from "@/lib/summoner/lp-change";
import { type LPSnapshot } from "@/lib/validators/lp-history";

const dateLabel = (t: number) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Area chart of absolute LP over time (pass known-tier snapshots only); tooltip shows the snapshot's real rank. */
export function LpChart({ snapshots }: { snapshots: LPSnapshot[] }) {
	const data = snapshots.map((s) => ({
		t: Date.parse(s.createdAt),
		value: toAbsoluteLp(s.tier, s.rank, s.lp),
		label: `${formatRankLabel(s.tier, s.rank)} · ${s.lp} LP`,
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
					<XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={dateLabel} stroke="var(--muted-foreground)" fontSize={11} />
					<YAxis domain={[ticks[0], ticks[ticks.length - 1]]} ticks={ticks} tickFormatter={lpAxisTickLabel} stroke="var(--muted-foreground)" fontSize={11} width={90} />
					<Tooltip
						contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
						labelFormatter={(t) => dateLabel(Number(t))}
						formatter={(_value, _name, item) => [item.payload.label, "Rank"]}
					/>
					<Area type="stepAfter" dataKey="value" stroke="var(--primary)" strokeWidth={2} fill="url(#lp-fill)" />
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}
