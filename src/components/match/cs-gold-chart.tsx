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
} from "recharts";
import { useMemo } from "react";

interface CsGoldChartProps {
	timeline?: Timeline;
}

interface CsGoldDataPoint {
	minute: number;
	blueCS: number;
	redCS: number;
	blueGold: number;
	redGold: number;
}

export default function CsGoldChart({ timeline }: CsGoldChartProps) {
	const data = useMemo(() => {
		if (!timeline) return [];

		return timeline.info.frames.map((frame): CsGoldDataPoint => {
			const minute = Math.round(frame.timestamp / 60000);
			let blueCS = 0;
			let redCS = 0;
			let blueGold = 0;
			let redGold = 0;

			for (const [, pf] of Object.entries(frame.participantFrames)) {
				if (pf.participantId <= 5) {
					blueCS += pf.minionsKilled;
					blueGold += pf.totalGold;
				} else {
					redCS += pf.minionsKilled;
					redGold += pf.totalGold;
				}
			}

			return { minute, blueCS, redCS, blueGold, redGold };
		});
	}, [timeline]);

	if (!timeline || data.length === 0) return null;

	return (
		<Panel>
			<PanelHeader title="CS & total gold" />
			<PanelBody>
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					{/* CS chart */}
					<div>
						<p className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
							CS
						</p>
						<div className="h-[200px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={data}>
									<XAxis
										dataKey="minute"
										tickFormatter={(v) => `${v}m`}
										stroke="var(--muted-foreground)"
										fontSize={11}
										tickLine={false}
										axisLine={false}
									/>
									<YAxis
										stroke="var(--muted-foreground)"
										fontSize={11}
										tickLine={false}
										axisLine={false}
										width={35}
									/>
									<Tooltip
										content={({
											active,
											payload,
											label,
										}) => {
											if (!active || !payload?.length)
												return null;
											const d = payload[0]
												.payload as CsGoldDataPoint;
											return (
												<div
													style={{
														backgroundColor:
															"var(--card)",
														border: "1px solid var(--border)",
														borderRadius: "8px",
														padding: "8px 12px",
														fontSize: "13px",
													}}
												>
													<p
														style={{
															color: "var(--muted-foreground)",
														}}
													>
														{label} min
													</p>
													<p
														style={{
															color: "var(--team-blue)",
														}}
													>
														Blue: {d.blueCS} CS
													</p>
													<p
														style={{
															color: "var(--team-red)",
														}}
													>
														Red: {d.redCS} CS
													</p>
												</div>
											);
										}}
									/>
									<Line
										type="monotone"
										dataKey="blueCS"
										stroke="var(--team-blue)"
										strokeWidth={2}
										dot={false}
									/>
									<Line
										type="monotone"
										dataKey="redCS"
										stroke="var(--team-red)"
										strokeWidth={2}
										dot={false}
									/>
								</LineChart>
							</ResponsiveContainer>
						</div>
					</div>

					{/* Gold chart */}
					<div>
						<p className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
							Total Gold
						</p>
						<div className="h-[200px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={data}>
									<XAxis
										dataKey="minute"
										tickFormatter={(v) => `${v}m`}
										stroke="var(--muted-foreground)"
										fontSize={11}
										tickLine={false}
										axisLine={false}
									/>
									<YAxis
										tickFormatter={(v) =>
											`${(v / 1000).toFixed(0)}k`
										}
										stroke="var(--muted-foreground)"
										fontSize={11}
										tickLine={false}
										axisLine={false}
										width={40}
									/>
									<Tooltip
										content={({
											active,
											payload,
											label,
										}) => {
											if (!active || !payload?.length)
												return null;
											const d = payload[0]
												.payload as CsGoldDataPoint;
											return (
												<div
													style={{
														backgroundColor:
															"var(--card)",
														border: "1px solid var(--border)",
														borderRadius: "8px",
														padding: "8px 12px",
														fontSize: "13px",
													}}
												>
													<p
														style={{
															color: "var(--muted-foreground)",
														}}
													>
														{label} min
													</p>
													<p
														style={{
															color: "var(--team-blue)",
														}}
													>
														Blue:{" "}
														{d.blueGold.toLocaleString()}{" "}
														gold
													</p>
													<p
														style={{
															color: "var(--team-red)",
														}}
													>
														Red:{" "}
														{d.redGold.toLocaleString()}{" "}
														gold
													</p>
												</div>
											);
										}}
									/>
									<Line
										type="monotone"
										dataKey="blueGold"
										stroke="var(--team-blue)"
										strokeWidth={2}
										dot={false}
									/>
									<Line
										type="monotone"
										dataKey="redGold"
										stroke="var(--team-red)"
										strokeWidth={2}
										dot={false}
									/>
								</LineChart>
							</ResponsiveContainer>
						</div>
					</div>
				</div>
			</PanelBody>
		</Panel>
	);
}
