"use client";

import { type LPSnapshot } from "@/hooks/useLPHistory";
import { type RankedEntry } from "@/lib/validators/ranked";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRankEmblem, RANK_COLORS } from "@/lib/icon-helpers";
import { formatRankLabel } from "@/lib/rank-calculator";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import Image from "next/image";

interface LPHistoryChartProps {
	soloHistory?: LPSnapshot[];
	flexHistory?: LPSnapshot[];
	ranked?: RankedEntry[];
}

const TIER_BASE: Record<string, number> = {
	IRON: 0,
	BRONZE: 400,
	SILVER: 800,
	GOLD: 1200,
	PLATINUM: 1600,
	EMERALD: 2000,
	DIAMOND: 2400,
	MASTER: 2800,
	GRANDMASTER: 2800,
	CHALLENGER: 2800,
};

const RANK_OFFSET: Record<string, number> = {
	IV: 0,
	III: 100,
	II: 200,
	I: 300,
};

function toAbsoluteLP(tier: string, rank: string, lp: number): number {
	const base = TIER_BASE[tier] ?? 0;
	if (["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tier)) {
		return base + lp;
	}
	return base + (RANK_OFFSET[rank] ?? 0) + lp;
}

function SingleQueueChart({
	history,
	entry,
	queueLabel,
}: {
	history: LPSnapshot[];
	entry?: RankedEntry;
	queueLabel: string;
}) {
	if (history.length < 2) return null;

	const data = history.map((h) => ({
		date: new Date(h.createdAt).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		}),
		lp: toAbsoluteLP(h.tier, h.rank, h.lp),
		tier: h.tier,
		rank: h.rank,
		rawLP: h.lp,
		wins: h.wins,
		losses: h.losses,
	}));

	const minLP = Math.min(...data.map((d) => d.lp));
	const maxLP = Math.max(...data.map((d) => d.lp));
	const padding = Math.max(50, (maxLP - minLP) * 0.1);
	const lastPoint = data[data.length - 1];
	const firstPoint = data[0];
	const lpChange = lastPoint.lp - firstPoint.lp;

	return (
		<div className="mb-6 last:mb-0">
			{/* Queue header */}
			<div className="flex items-center gap-3 mb-3">
				{entry && (
					<Image
						src={getRankEmblem(entry.tier)}
						alt={entry.tier}
						width={36}
						height={36}
					/>
				)}
				<div>
					<p className="text-sm text-muted-foreground">{queueLabel}</p>
					{entry ? (
						<p
							className="text-base font-bold"
							style={{ color: RANK_COLORS[entry.tier] ?? "#888" }}
						>
							{formatRankLabel(entry.tier, entry.rank)}{" "}
							<span className="text-sm font-normal text-muted-foreground">
								{entry.leaguePoints} LP
							</span>
							<span
								className={`ml-2 text-sm font-medium ${
									lpChange >= 0 ? "text-win" : "text-loss"
								}`}
							>
								{lpChange >= 0 ? "+" : ""}
								{lpChange}
							</span>
						</p>
					) : (
						<p className="text-sm text-muted-foreground">
							No rank data
						</p>
					)}
				</div>
			</div>

			{/* Chart */}
			<div className="h-[140px] w-full">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={data}>
						<XAxis
							dataKey="date"
							stroke="hsl(220 15% 30%)"
							fontSize={10}
							tickLine={false}
							axisLine={false}
						/>
						<YAxis
							domain={[minLP - padding, maxLP + padding]}
							hide
						/>
						<Tooltip
							content={({ active, payload }) => {
								if (!active || !payload?.[0]) return null;
								const d = payload[0].payload;
								return (
									<div
										style={{
											backgroundColor: "hsl(220 20% 12%)",
											border: "1px solid hsl(220 15% 20%)",
											borderRadius: "8px",
											padding: "8px 12px",
											fontSize: "13px",
										}}
									>
										<p style={{ fontWeight: 600 }}>
											{formatRankLabel(d.tier, d.rank)}
										</p>
										<p
											style={{
												color: RANK_COLORS[d.tier] ?? "#888",
											}}
										>
											{d.rawLP} LP
										</p>
										{d.wins != null && (
											<p
												style={{
													color: "hsl(220 15% 60%)",
													fontSize: "12px",
												}}
											>
												{d.wins}W {d.losses}L
											</p>
										)}
									</div>
								);
							}}
						/>
						<Line
							type="monotone"
							dataKey="lp"
							stroke={RANK_COLORS[lastPoint?.tier] ?? "#888"}
							strokeWidth={2}
							dot={false}
							activeDot={{
								r: 4,
								fill: "hsl(220 20% 12%)",
								strokeWidth: 2,
							}}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}

export default function LPHistoryChart({
	soloHistory,
	flexHistory,
	ranked,
}: LPHistoryChartProps) {
	const soloEntry = ranked?.find((e) => e.queueType === "RANKED_SOLO_5x5");
	const flexEntry = ranked?.find((e) => e.queueType === "RANKED_FLEX_SR");

	const hasSolo = soloHistory && soloHistory.length >= 2;
	const hasFlex = flexHistory && flexHistory.length >= 2;

	if (!hasSolo && !hasFlex) return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
					LP History
				</CardTitle>
			</CardHeader>
			<CardContent>
				{hasSolo && (
					<SingleQueueChart
						history={soloHistory}
						entry={soloEntry}
						queueLabel="Solo/Duo"
					/>
				)}
				{hasFlex && (
					<SingleQueueChart
						history={flexHistory}
						entry={flexEntry}
						queueLabel="Flex"
					/>
				)}
			</CardContent>
		</Card>
	);
}
