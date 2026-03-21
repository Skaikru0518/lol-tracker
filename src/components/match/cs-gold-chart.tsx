"use client";

import { type Timeline } from "@/lib/validators/timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
					CS & Total Gold
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					{/* CS chart */}
					<div>
						<p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
							CS
						</p>
						<div className="h-[200px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={data}>
									<XAxis
										dataKey="minute"
										tickFormatter={(v) => `${v}m`}
										stroke="hsl(220 15% 30%)"
										fontSize={11}
										tickLine={false}
										axisLine={false}
									/>
									<YAxis
										stroke="hsl(220 15% 30%)"
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
															color: "#3b82f6",
														}}
													>
														Blue: {d.blueCS} CS
													</p>
													<p
														style={{
															color: "#ef4444",
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
										stroke="#3b82f6"
										strokeWidth={2}
										dot={false}
									/>
									<Line
										type="monotone"
										dataKey="redCS"
										stroke="#ef4444"
										strokeWidth={2}
										dot={false}
									/>
								</LineChart>
							</ResponsiveContainer>
						</div>
					</div>

					{/* Gold chart */}
					<div>
						<p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
							Total Gold
						</p>
						<div className="h-[200px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={data}>
									<XAxis
										dataKey="minute"
										tickFormatter={(v) => `${v}m`}
										stroke="hsl(220 15% 30%)"
										fontSize={11}
										tickLine={false}
										axisLine={false}
									/>
									<YAxis
										tickFormatter={(v) =>
											`${(v / 1000).toFixed(0)}k`
										}
										stroke="hsl(220 15% 30%)"
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
															color: "#3b82f6",
														}}
													>
														Blue:{" "}
														{d.blueGold.toLocaleString()}{" "}
														gold
													</p>
													<p
														style={{
															color: "#ef4444",
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
										stroke="#3b82f6"
										strokeWidth={2}
										dot={false}
									/>
									<Line
										type="monotone"
										dataKey="redGold"
										stroke="#ef4444"
										strokeWidth={2}
										dot={false}
									/>
								</LineChart>
							</ResponsiveContainer>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
