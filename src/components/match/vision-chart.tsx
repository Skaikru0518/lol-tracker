"use client";

import { type Participant } from "@/lib/validators/match";
import { getChampionDisplayName } from "@/lib/icon-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from "recharts";

interface VisionChartProps {
	participants: Participant[];
}

interface VisionDataPoint {
	name: string;
	visionScore: number;
	wardsPlaced: number;
	wardsKilled: number;
	controlWards: number;
	team: "blue" | "red";
}

export default function VisionChart({ participants }: VisionChartProps) {
	const data: VisionDataPoint[] = participants
		.map((p) => ({
			name: getChampionDisplayName(p.championName),
			visionScore: p.visionScore,
			wardsPlaced: p.wardsPlaced,
			wardsKilled: p.wardsKilled,
			controlWards: p.visionWardsBoughtInGame,
			team: (p.teamId === 100 ? "blue" : "red") as "blue" | "red",
		}))
		.sort((a, b) => b.visionScore - a.visionScore);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
					Vision Score
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="h-[300px] md:h-[400px] w-full">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							data={data}
							layout="vertical"
							margin={{ left: 10, right: 20 }}
						>
							<XAxis
								type="number"
								stroke="hsl(220 15% 30%)"
								fontSize={12}
								tickLine={false}
								axisLine={false}
							/>
							<YAxis
								type="category"
								dataKey="name"
								width={70}
								stroke="hsl(220 15% 30%)"
								fontSize={12}
								tickLine={false}
								axisLine={false}
							/>
							<Tooltip
								cursor={{ fill: "hsl(220 15% 15%)" }}
								content={({ active, payload }) => {
									if (!active || !payload?.[0]) return null;
									const d = payload[0]
										.payload as VisionDataPoint;
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
													fontWeight: 600,
													marginBottom: 4,
												}}
											>
												{d.name}
											</p>
											<p>
												Vision Score: {d.visionScore}
											</p>
											<p>
												Wards Placed: {d.wardsPlaced}
											</p>
											<p>
												Wards Killed: {d.wardsKilled}
											</p>
											<p>
												Control Wards:{" "}
												{d.controlWards}
											</p>
										</div>
									);
								}}
							/>
							<Bar
								dataKey="visionScore"
								radius={[0, 4, 4, 0]}
								barSize={20}
							>
								{data.map((entry, i) => (
									<Cell
										key={i}
										fill={
											entry.team === "blue"
												? "#3b82f6"
												: "#ef4444"
										}
										fillOpacity={0.7}
									/>
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</CardContent>
		</Card>
	);
}
