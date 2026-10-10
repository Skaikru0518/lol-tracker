"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { formatThousands } from "@/lib/format";
import { grubWaves, objectiveEvents } from "@/lib/match/timeline-events";
import { type Timeline } from "@/lib/validators/timeline";
import { AXIS, GRID, TEAM_COLOR, TOOLTIP_STYLE } from "./charts/chart-theme";

const MARKER_KINDS = new Set(["dragon", "elder", "baron", "herald", "grubs", "atakhan"]);

/** Blue minus red team gold per minute, split-coloured around zero, with monster objectives marked under the axis. */
export default function GoldChart({ timeline }: { timeline?: Timeline }) {
	const data = useMemo(
		() =>
			(timeline?.info.frames ?? []).map((frame) => {
				let diff = 0;
				for (const pf of Object.values(frame.participantFrames)) diff += pf.participantId <= 5 ? pf.totalGold : -pf.totalGold;
				return { minute: frame.timestamp / 60000, diff };
			}),
		[timeline],
	);
	const markers = useMemo(() => (timeline ? grubWaves(objectiveEvents(timeline)).filter((o) => MARKER_KINDS.has(o.kind)) : []), [timeline]);

	if (!timeline || data.length === 0) return null;
	const peak = Math.max(1000, ...data.map((d) => Math.abs(d.diff)));
	const bound = Math.ceil(peak / 1000) * 1000;
	const last = data[data.length - 1].diff;
	const highest = Math.max(0, ...data.map((d) => d.diff));
	const lowest = Math.min(0, ...data.map((d) => d.diff));
	// Gradient offsets are relative to the area's own box, so the zero line sits at this fraction
	const split = highest === lowest ? 0.5 : highest / (highest - lowest);

	return (
		<Panel className="flex h-full flex-col">
			<PanelHeader
				title="Team gold advantage"
				actions={
					<span className="text-xs text-muted-foreground">
						{last === 0 ? "Even" : `${last > 0 ? "Blue" : "Red"} +${formatThousands(Math.abs(last))}`}
					</span>
				}
			/>
			<PanelBody className="flex-1">
				<div className="h-60">
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 34 }}>
							<defs>
								<linearGradient id="gold-split" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor={TEAM_COLOR.blue} stopOpacity={0.45} />
									<stop offset={split} stopColor={TEAM_COLOR.blue} stopOpacity={0.05} />
									<stop offset={split} stopColor={TEAM_COLOR.red} stopOpacity={0.05} />
									<stop offset="100%" stopColor={TEAM_COLOR.red} stopOpacity={0.45} />
								</linearGradient>
							</defs>
							<CartesianGrid {...GRID} />
							<XAxis dataKey="minute" type="number" domain={[0, "dataMax"]} tickFormatter={(m: number) => `${Math.round(m)}m`} {...AXIS} />
							<YAxis domain={[-bound, bound]} tickFormatter={(v: number) => (v === 0 ? "0" : `${v > 0 ? "+" : "-"}${Math.abs(v) / 1000}k`)} width={40} {...AXIS} />
							<ReferenceLine y={0} stroke="var(--border)" />
							<Tooltip
								{...TOOLTIP_STYLE}
								labelFormatter={(m) => `${Math.round(Number(m))} min`}
								formatter={(value) => {
									const v = Number(value);
									return [v === 0 ? "Even" : `${v > 0 ? "Blue" : "Red"} +${formatThousands(Math.abs(v))}`, "Gold"];
								}}
							/>
							<Area type="monotone" dataKey="diff" stroke="var(--foreground)" strokeWidth={1.5} fill="url(#gold-split)" baseValue={0} />
							{markers.map((o, i) => (
								<ReferenceDot
									key={`${o.timestamp}-${i}`}
									x={o.timestamp / 60000}
									y={-bound}
									r={0}
									ifOverflow="visible"
									shape={(props: { cx?: number; cy?: number }) => (
										<g>
											<title>{o.label}</title>
											<circle cx={props.cx} cy={(props.cy ?? 0) + 34} r={9} fill="var(--card)" stroke={TEAM_COLOR[o.side]} strokeWidth={1.5} />
											<image href={o.icon} x={(props.cx ?? 0) - 6} y={(props.cy ?? 0) + 28} width={12} height={12} />
										</g>
									)}
								/>
							))}
						</AreaChart>
					</ResponsiveContainer>
				</div>
			</PanelBody>
		</Panel>
	);
}
