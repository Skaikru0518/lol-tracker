"use client";

import { type Timeline } from "@/lib/validators/timeline";
import { type Participant } from "@/lib/validators/match";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	ReferenceArea,
	ReferenceLine,
} from "recharts";
import { useMemo } from "react";

interface KillTimelineProps {
	timeline?: Timeline;
	participants: Participant[];
}

interface KillDataPoint {
	minute: number;
	blueKills: number;
	redKills: number;
	diff: number;
}

export default function KillTimeline({
	timeline,
	participants,
}: KillTimelineProps) {
	const data = useMemo(() => {
		if (!timeline) return [];

		let blueCumulative = 0;
		let redCumulative = 0;

		return timeline.info.frames.map((frame): KillDataPoint => {
			const minute = Math.round(frame.timestamp / 60000);

			for (const event of frame.events) {
				if (event.type === "CHAMPION_KILL" && event.killerId) {
					if (event.killerId <= 5) {
						blueCumulative++;
					} else {
						redCumulative++;
					}
				}
			}

			return {
				minute,
				blueKills: blueCumulative,
				redKills: redCumulative,
				diff: blueCumulative - redCumulative,
			};
		});
	}, [timeline]);

	if (!timeline || data.length === 0) return null;

	const maxKills = Math.max(
		...data.map((d) => Math.max(d.blueKills, d.redKills)),
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
					Kills Over Time
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="h-[250px] w-full">
					<ResponsiveContainer width="100%" height="100%">
						<LineChart data={data}>
							<XAxis
								dataKey="minute"
								tickFormatter={(v) => `${v}m`}
								stroke="hsl(220 15% 30%)"
								fontSize={12}
								tickLine={false}
								axisLine={false}
							/>
							<YAxis
								domain={[0, maxKills + 2]}
								stroke="hsl(220 15% 30%)"
								fontSize={12}
								tickLine={false}
								axisLine={false}
								width={30}
								allowDecimals={false}
							/>
							<Tooltip
								content={({ active, payload, label }) => {
									if (!active || !payload?.length)
										return null;
									const d = payload[0]
										.payload as KillDataPoint;
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
											<p style={{ color: "#3b82f6" }}>
												Blue: {d.blueKills} kills
											</p>
											<p style={{ color: "#ef4444" }}>
												Red: {d.redKills} kills
											</p>
										</div>
									);
								}}
							/>
							<Line
								type="monotone"
								dataKey="blueKills"
								stroke="#3b82f6"
								strokeWidth={2}
								dot={false}
								activeDot={{ r: 4, fill: "#3b82f6" }}
							/>
							<Line
								type="monotone"
								dataKey="redKills"
								stroke="#ef4444"
								strokeWidth={2}
								dot={false}
								activeDot={{ r: 4, fill: "#ef4444" }}
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>
			</CardContent>
		</Card>
	);
}
