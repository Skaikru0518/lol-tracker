"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { type TeamPoint } from "@/lib/match/timeline-events";
import { AXIS, GRID, TEAM_COLOR, TOOLTIP_STYLE } from "./chart-theme";

const SIDES = ["blue", "red"] as const;

/** Blue and red team totals over time as two gradient areas, in the same style as the gold advantage chart. */
export function TeamAreaChart({
	title,
	data,
	format = (value) => String(value),
	actions,
}: {
	title: string;
	data: TeamPoint[];
	format?: (value: number) => string;
	actions?: React.ReactNode;
}) {
	const id = useId().replace(/:/g, "");
	if (data.length === 0) return null;
	const last = data[data.length - 1];

	return (
		<Panel className="flex h-full flex-col">
			<PanelHeader
				title={title}
				actions={
					<div className="flex items-center gap-3">
						<span className="text-xs text-muted-foreground">
							<span className="text-team-blue">{format(last.blue)}</span> · <span className="text-team-red">{format(last.red)}</span>
						</span>
						{actions}
					</div>
				}
			/>
			<PanelBody className="flex-1">
				<div className="h-60">
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
							<defs>
								{SIDES.map((side) => (
									<linearGradient key={side} id={`${id}-${side}`} x1="0" y1="0" x2="0" y2="1">
										<stop offset="0%" stopColor={TEAM_COLOR[side]} stopOpacity={0.35} />
										<stop offset="100%" stopColor={TEAM_COLOR[side]} stopOpacity={0} />
									</linearGradient>
								))}
							</defs>
							<CartesianGrid {...GRID} />
							<XAxis dataKey="minute" type="number" domain={[0, "dataMax"]} tickFormatter={(m: number) => `${m}m`} {...AXIS} />
							<YAxis tickFormatter={(v: number) => format(v)} width={40} {...AXIS} />
							<Tooltip
								{...TOOLTIP_STYLE}
								labelFormatter={(m) => `${m} min`}
								formatter={(value, name) => [format(Number(value)), name === "blue" ? "Blue" : "Red"]}
							/>
							{SIDES.map((side) => (
								<Area key={side} type="monotone" dataKey={side} stroke={TEAM_COLOR[side]} strokeWidth={1.5} fill={`url(#${id}-${side})`} />
							))}
						</AreaChart>
					</ResponsiveContainer>
				</div>
			</PanelBody>
		</Panel>
	);
}
