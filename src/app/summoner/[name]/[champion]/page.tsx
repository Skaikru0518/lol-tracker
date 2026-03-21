"use client";

import { use, useEffect, useMemo } from "react";
import { useAccount } from "@/hooks/useAccount";
import { useMatches } from "@/hooks/useMatches";
import { useMastery } from "@/hooks/useMastery";
import { useDDragonVersion } from "@/hooks/useDDragonVersion";
import { useChampions } from "@/hooks/useChampions";
import { calculateStats } from "@/lib/match-stats";
import { getChampionIcon } from "@/lib/icon-helpers";
import { MatchList } from "@/components/summoner/match-history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Loader from "@/components/ui/loader";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

function StatBlock({
	label,
	value,
	highlight,
}: {
	label: string;
	value: string | number;
	highlight?: boolean;
}) {
	return (
		<div className="text-center">
			<p
				className={`text-2xl font-bold ${highlight ? "text-primary" : ""}`}
			>
				{value}
			</p>
			<p className="text-xs text-muted-foreground">{label}</p>
		</div>
	);
}

export default function ChampionPage({
	params,
}: {
	params: Promise<{ name: string; champion: string }>;
}) {
	const { name, champion: championSlug } = use(params);
	const [gameName, tagLine] = name.split("-");

	const { data: version } = useDDragonVersion();
	const { data: champions } = useChampions();
	const {
		data: account,
		isLoading: accountLoading,
		error: accountError,
	} = useAccount(gameName, tagLine);
	const { data: masteries } = useMastery(account?.puuid);

	// Find champion by slug
	const champion = useMemo(() => {
		if (!champions) return null;
		return Object.values(champions).find(
			(c) => c.id.toLowerCase() === championSlug.toLowerCase(),
		);
	}, [champions, championSlug]);

	const championId = champion ? parseInt(champion.key) : undefined;

	const { data: matches, isLoading: matchesLoading } = useMatches(
		championId ? account?.puuid : undefined,
		20,
		championId,
	);

	const mastery = useMemo(() => {
		if (!masteries || !championId) return null;
		return masteries.find((m) => m.championId === championId);
	}, [masteries, championId]);

	const stats = useMemo(() => {
		if (!matches || !account) return null;
		return calculateStats(matches, account.puuid);
	}, [matches, account]);

	useEffect(() => {
		if (accountError) toast.error("Summoner not found");
	}, [accountError]);

	if (accountLoading) return <Loader fullScreen />;
	if (!account) return null;

	return (
		<div className="mx-auto max-w-7xl px-6 py-8 lg:px-12">
			{/* Back link */}
			<Link
				href={`/summoner/${name}`}
				className="text-sm text-muted-foreground hover:text-foreground transition-colors"
			>
				← Back to {gameName}
			</Link>

			{/* Champion header */}
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
				className="mt-6 flex items-center gap-5"
			>
				{version && champion && (
					<Image
						src={getChampionIcon(version, champion.id)}
						alt={champion.name}
						width={80}
						height={80}
						className="rounded-2xl"
					/>
				)}
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						{champion?.name ?? championSlug}
					</h1>
					<p className="text-base text-muted-foreground">
						{gameName}#{tagLine}
						{mastery && (
							<span className="ml-2">
								· Mastery {mastery.championLevel} ·{" "}
								{mastery.championPoints.toLocaleString()} pts
							</span>
						)}
					</p>
				</div>
			</motion.div>

			{/* Stats + Match history */}
			<div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]">
				{/* Stats sidebar */}
				<motion.div
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5, delay: 0.1 }}
					className="space-y-4"
				>
					{stats && stats.totalGames > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
									Stats ({stats.totalGames} games)
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-6">
								<div className="grid grid-cols-2 gap-4">
									<StatBlock
										label="Win Rate"
										value={`${stats.winRate}%`}
										highlight
									/>
									<StatBlock
										label="KDA"
										value={stats.avgKDA}
										highlight
									/>
								</div>
								<div className="grid grid-cols-3 gap-3">
									<StatBlock
										label="Kills"
										value={stats.avgKills}
									/>
									<StatBlock
										label="Deaths"
										value={stats.avgDeaths}
									/>
									<StatBlock
										label="Assists"
										value={stats.avgAssists}
									/>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<StatBlock
										label="CS"
										value={stats.avgCS}
									/>
									<StatBlock
										label="Gold"
										value={`${(stats.avgGold / 1000).toFixed(1)}k`}
									/>
									<StatBlock
										label="Damage"
										value={`${(stats.avgDamage / 1000).toFixed(1)}k`}
									/>
									<StatBlock
										label="Vision"
										value={stats.avgVisionScore}
									/>
								</div>

								{/* Win/Loss bar */}
								<div>
									<div className="flex justify-between text-sm mb-1">
										<span className="text-win font-medium">
											{stats.wins}W
										</span>
										<span className="text-loss font-medium">
											{stats.losses}L
										</span>
									</div>
									<div className="flex h-2 overflow-hidden rounded-full bg-loss/30">
										<div
											className="bg-win rounded-full"
											style={{
												width: `${stats.winRate}%`,
											}}
										/>
									</div>
								</div>

								{/* Recent trend */}
								<div>
									<p className="mb-2 text-xs text-muted-foreground">
										Recent
									</p>
									<div className="flex gap-1">
										{stats.recentTrend.map((win, i) => (
											<div
												key={i}
												className={`h-5 flex-1 rounded-sm ${
													win
														? "bg-win"
														: "bg-loss"
												}`}
											/>
										))}
									</div>
								</div>
							</CardContent>
						</Card>
					)}
				</motion.div>

				{/* Match history */}
				<motion.div
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5, delay: 0.2 }}
				>
					<MatchList
						matches={matches}
						puuid={account.puuid}
						version={version}
						isLoading={matchesLoading}
					/>
				</motion.div>
			</div>
		</div>
	);
}
