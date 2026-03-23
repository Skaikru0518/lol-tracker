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

interface DamageChartProps {
	participants: Participant[];
}

interface DamageDataPoint {
	name: string;
	physical: number;
	magic: number;
	true_: number;
	total: number;
	team: "blue" | "red";
}

export default function DamageChart({ participants }: DamageChartProps) {
	const data: DamageDataPoint[] = participants.map((p) => ({
		name: getChampionDisplayName(p.championName),
		physical: p.physicalDamageDealtToChampions,
		magic: p.magicDamageDealtToChampions,
		true_: p.trueDamageDealtToChampions,
		total: p.totalDamageDealtToChampions,
		team: p.teamId === 100 ? "blue" : "red",
	}));

	// Sort by total damage descending
	data.sort((a, b) => b.total - a.total);

	const maxDmg = Math.max(...data.map((d) => d.total));

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
					Damage to Champions
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
								domain={[0, maxDmg]}
								tickFormatter={(v) =>
									`${(v / 1000).toFixed(0)}k`
								}
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
										.payload as DamageDataPoint;
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
											<p style={{ color: "#ef4444" }}>
												Physical:{" "}
												{d.physical.toLocaleString()}
											</p>
											<p style={{ color: "#3b82f6" }}>
												Magic:{" "}
												{d.magic.toLocaleString()}
											</p>
											<p style={{ color: "#e5e5e5" }}>
												True:{" "}
												{d.true_.toLocaleString()}
											</p>
											<p
												style={{
													color: "hsl(220 15% 60%)",
													marginTop: 4,
													borderTop:
														"1px solid hsl(220 15% 25%)",
													paddingTop: 4,
												}}
											>
												Total:{" "}
												{d.total.toLocaleString()}
											</p>
										</div>
									);
								}}
							/>
							<Bar
								dataKey="total"
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
