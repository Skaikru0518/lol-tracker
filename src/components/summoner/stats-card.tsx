"use client";

import { type Match } from "@/lib/validators/match";
import {
	type Champion,
	getChampionIcon,
	getChampionDisplayName,
} from "@/lib/icon-helpers";
import { calculateStats } from "@/lib/match-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CountUp from "@/components/CountUp";
import Image from "next/image";
import { useMemo } from "react";

interface StatsCardProps {
	matches?: Match[];
	puuid: string;
	champions?: Record<number, Champion>;
	version?: string;
}

function StatBlock({
	label,
	value,
}: {
	label: string;
	value: string | number;
}) {
	const numValue = typeof value === "string" ? parseFloat(value) : value;
	const isNumber = !isNaN(numValue);
	const suffix = typeof value === "string" ? value.replace(/[\d.-]/g, "") : "";

	return (
		<div className="text-center">
			<p className="text-xl font-bold">
				{isNumber ? (
					<>
						<CountUp to={numValue} duration={1.5} separator="," />
						{suffix}
					</>
				) : (
					value
				)}
			</p>
			<p className="text-sm text-muted-foreground">{label}</p>
		</div>
	);
}

export default function StatsCard({
	matches,
	puuid,
	champions,
	version,
}: StatsCardProps) {
	const stats = useMemo(
		() => (matches ? calculateStats(matches, puuid) : null),
		[matches, puuid],
	);

	if (!stats || stats.totalGames === 0) return null;

	return (
		<div className="space-y-4">
			{/* Overview */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
						Overview
						<span className="ml-2 text-sm font-normal normal-case">
							Last {stats.totalGames} games
						</span>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 gap-4">
						<div className="text-center">
							<p
								className={`text-3xl font-bold ${
									stats.winRate > 60
										? "text-yellow-400"
										: stats.winRate >= 51
											? "text-win"
											: stats.winRate === 50
												? "text-foreground"
												: stats.winRate >= 40
													? "text-orange-400"
													: "text-loss"
								}`}
							>
								<CountUp to={stats.winRate} duration={1.5} />%
							</p>
							<p className="text-sm text-muted-foreground">
								{stats.wins}W {stats.losses}L
							</p>
						</div>
						<div className="text-center">
							<p className="text-3xl font-bold">
								<span className="text-primary">
									<CountUp to={stats.avgKDA} duration={1.5} />
								</span>
							</p>
							<p className="text-sm text-muted-foreground">
								{stats.avgKills}/{stats.avgDeaths}/{stats.avgAssists}
							</p>
						</div>
					</div>

					<div className="mt-5 grid grid-cols-4 gap-3">
						<StatBlock label="CS" value={stats.avgCS} />
						<StatBlock
							label="Gold"
							value={`${(stats.avgGold / 1000).toFixed(1)}k`}
						/>
						<StatBlock
							label="Damage"
							value={`${(stats.avgDamage / 1000).toFixed(1)}k`}
						/>
						<StatBlock label="Vision" value={stats.avgVisionScore} />
					</div>

					{/* Recent trend */}
					<div className="mt-5">
						<p className="mb-2 text-sm text-muted-foreground">Recent</p>
						<div className="flex gap-1">
							{stats.recentTrend.map((win, i) => (
								<div
									key={i}
									className={`h-5 flex-1 rounded-sm ${
										win ? "bg-win" : "bg-loss"
									}`}
								/>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Most played champions */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
						Most Played
						<span className="block text-xs font-normal normal-case tracking-normal mt-0.5">
							Last 50 matches · ARAM + Arena excluded
						</span>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{stats.champStats.slice(0, 5).map((c) => {
						const champ = champions?.[c.championId];
						const wr = Math.round((c.wins / c.games) * 100);

						return (
							<div key={c.championName} className="flex items-center gap-3">
								{champ && version ? (
									<Image
										src={getChampionIcon(version, champ.id)}
										alt={c.championName}
										width={45}
										height={45}
										className="rounded-xl"
									/>
								) : (
									<div className="size-10 rounded-xl bg-muted" />
								)}
								<div className="flex-1 min-w-0">
									<p className="text-sm flex flex-row gap-4 font-semibold truncate">
										{getChampionDisplayName(c.championName)}{" "}
									</p>
									<p className="text-sm text-muted-foreground">
										{c.avgKills.toFixed(1)}/{c.avgDeaths.toFixed(1)}/
										{c.avgAssists.toFixed(1)} KDA
										<span className="flex flex-row gap-1 text-accent">
											{((c.avgKills + c.avgAssists) / c.avgDeaths).toFixed(1)}
											<span>KDA</span>
										</span>
									</p>
								</div>
								<div className="text-right">
									<p
										className={`text-sm font-medium ${
											wr >= 50 ? "text-win" : "text-loss"
										}`}
									>
										{wr}%
									</p>
									<p className="text-sm text-muted-foreground">
										{c.wins}W {c.games - c.wins}L
									</p>
								</div>
							</div>
						);
					})}
				</CardContent>
			</Card>
		</div>
	);
}
