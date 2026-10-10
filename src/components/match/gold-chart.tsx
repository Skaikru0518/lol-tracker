"use client";

import { type Timeline } from "@/lib/validators/timeline";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	ReferenceLine,
	ReferenceArea,
} from "recharts";
import { useMemo } from "react";

interface GoldChartProps {
	timeline?: Timeline;
}

interface GoldDataPoint {
	minute: number;
	diff: number;
}

export default function GoldChart({ timeline }: GoldChartProps) {
	const data = useMemo(() => {
		if (!timeline) return [];

		return timeline.info.frames.map((frame): GoldDataPoint => {
			const minute = Math.round(frame.timestamp / 60000);
			let blueGold = 0;
			let redGold = 0;

			for (const [, pf] of Object.entries(frame.participantFrames)) {
				if (pf.participantId <= 5) {
					blueGold += pf.totalGold;
				} else {
					redGold += pf.totalGold;
				}
			}

			return {
				minute,
				diff: blueGold - redGold,
			};
		});
	}, [timeline]);

	if (!timeline || data.length === 0) return null;

	const maxDiff = Math.max(...data.map((d) => Math.abs(d.diff)));
	const yDomain = Math.ceil(maxDiff / 1000) * 1000 || 5000;
	const lastMinute = data[data.length - 1]?.minute ?? 0;

	return (
		<Panel>
			<PanelHeader title="Team gold advantage" />
			<PanelBody>
				<div className="h-[250px] w-full">
					<ResponsiveContainer width="100%" height="100%">
						<LineChart data={data}>
							{/* Blue background (top half) */}
							<ReferenceArea
								y1={0}
								y2={yDomain}
								x1={0}
								x2={lastMinute}
								fill="var(--team-blue)"
								fillOpacity={0.06}
							/>
							{/* Red background (bottom half) */}
							<ReferenceArea
								y1={-yDomain}
								y2={0}
								x1={0}
								x2={lastMinute}
								fill="var(--team-red)"
								fillOpacity={0.06}
							/>
							<XAxis
								dataKey="minute"
								tickFormatter={(v) => `${v}m`}
								stroke="var(--muted-foreground)"
								fontSize={12}
								tickLine={false}
								axisLine={false}
							/>
							<YAxis
								domain={[-yDomain, yDomain]}
								tickFormatter={(v) =>
									v === 0
										? "0"
										: `+${(Math.abs(v) / 1000).toFixed(0)}k`
								}
								stroke="var(--muted-foreground)"
								fontSize={12}
								tickLine={false}
								axisLine={false}
								width={35}
							/>
							<Tooltip
								content={({ active, payload, label }) => {
									if (!active || !payload?.[0]) return null;
									const diff =
										payload[0].payload.diff as number;
									const team = diff >= 0 ? "Blue" : "Red";
									const color =
										diff >= 0 ? "#3b82f6" : "#ef4444";
									return (
										<div
											style={{
												backgroundColor:
													"hsl(220 20% 12%)",
												border: "1px solid hsl(220 15% 20%)",
												borderRadius: "8px",
												padding: "8px 12px",
												fontSize: "13px",
											}}
										>
											<p
												style={{
													color: "hsl(220 15% 60%)",
												}}
											>
												{label} min
											</p>
											<p
												style={{
													color,
													fontWeight: 600,
												}}
											>
												{team} +
												{Math.abs(diff).toLocaleString()} gold
											</p>
										</div>
									);
								}}
							/>
							<ReferenceLine
								y={0}
								stroke="var(--border)"
								strokeWidth={1}
							/>
							<Line
								type="monotone"
								dataKey="diff"
								stroke="var(--foreground)"
								strokeWidth={2}
								dot={false}
								activeDot={{
									r: 4,
									fill: "hsl(220 20% 12%)",
									stroke: "hsl(220 15% 75%)",
									strokeWidth: 2,
								}}
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>
			</PanelBody>
		</Panel>
	);
}
