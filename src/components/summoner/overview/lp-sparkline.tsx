"use client";

import { useState } from "react";
import { formatRankLabel } from "@/lib/rank-calculator";
import { sparklineIndexAt, sparklinePoints } from "@/lib/summoner/sparkline";
import { toAbsoluteLp } from "@/lib/summoner/lp-change";
import { type LPSnapshot } from "@/lib/validators/lp-history";

const WIDTH = 240;
const HEIGHT = 36;

const timeLabel = (iso: string) =>
	new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** 30-day LP trend line; hovering shows the nearest snapshot's time and rank. Renders nothing with fewer than two snapshots. */
export function LpSparkline({ snapshots }: { snapshots?: LPSnapshot[] }) {
	const [hover, setHover] = useState<number | null>(null);
	if (!snapshots || snapshots.length < 2) return null;

	const points = sparklinePoints(snapshots.map((s) => toAbsoluteLp(s.tier, s.rank, s.lp)), WIDTH, HEIGHT);
	const active = hover === null ? null : snapshots[hover];
	const ratio = hover === null ? 0 : hover / (snapshots.length - 1);
	// Keep the tooltip inside the card at both ends
	const shift = ratio < 0.2 ? "0%" : ratio > 0.8 ? "-100%" : "-50%";

	return (
		<div
			className="relative mt-3"
			onMouseMove={(e) => {
				const rect = e.currentTarget.getBoundingClientRect();
				setHover(sparklineIndexAt(e.clientX - rect.left, rect.width, snapshots.length));
			}}
			onMouseLeave={() => setHover(null)}
		>
			<svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="h-9 w-full" aria-hidden>
				<polyline points={points} fill="none" stroke="var(--primary)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
				{hover !== null && (
					<line
						x1={ratio * WIDTH}
						x2={ratio * WIDTH}
						y1={0}
						y2={HEIGHT}
						stroke="var(--muted-foreground)"
						strokeDasharray="2 2"
						vectorEffect="non-scaling-stroke"
					/>
				)}
			</svg>
			{active && (
				<div
					className="pointer-events-none absolute -top-7 whitespace-nowrap rounded-md border bg-popover px-1.5 py-0.5 text-2xs text-popover-foreground shadow-sm"
					style={{ left: `${ratio * 100}%`, transform: `translateX(${shift})` }}
				>
					{timeLabel(active.createdAt)} · {formatRankLabel(active.tier, active.rank)} {active.lp} LP
				</div>
			)}
		</div>
	);
}
