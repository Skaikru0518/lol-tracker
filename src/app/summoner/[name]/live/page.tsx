"use client";

import { use, useState, useEffect, useMemo } from "react";
import { useAccount } from "@/hooks/useAccount";
import { useLiveGame } from "@/hooks/useLiveGame";
import { useDDragonVersion } from "@/hooks/useDDragonVersion";
import { useChampions } from "@/hooks/useChampions";
import { useRunes } from "@/hooks/useRunes";
import { usePlayerRanks } from "@/hooks/usePlayerRanks";
import { getQueueName } from "@/lib/queue-names";
import { calculateAvgRank, formatRankLabel } from "@/lib/rank-calculator";
import {
	getChampionIcon,
	getSummonerSpellIcon,
	getRuneIcon,
	getRankEmblem,
	RANK_COLORS,
} from "@/lib/icon-helpers";
import BackButton from "@/components/ui/back-button";
import Loader from "@/components/ui/loader";
import {
	Table,
	TableHeader,
	TableBody,
	TableHead,
	TableRow,
	TableCell,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

function formatTime(seconds: number) {
	const abs = Math.abs(seconds);
	const m = Math.floor(abs / 60);
	const s = abs % 60;
	return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function LiveGamePage({
	params,
}: {
	params: Promise<{ name: string }>;
}) {
	const { name } = use(params);
	const [gameName, tagLine] = name.split("-");

	const { data: version } = useDDragonVersion();
	const { data: champions } = useChampions();
	const { data: runeData } = useRunes();
	const {
		data: account,
		isLoading: accountLoading,
		error: accountError,
	} = useAccount(gameName, tagLine);
	const { data: liveGame, isLoading: liveLoading } = useLiveGame(
		account?.puuid,
	);

	const livePuuids = useMemo(
		() => liveGame?.participants?.map((p) => p.puuid),
		[liveGame?.participants],
	);
	const { data: playerRanks } = usePlayerRanks(livePuuids);

	const [elapsed, setElapsed] = useState(0);

	useEffect(() => {
		if (!liveGame?.inGame || liveGame.gameLength == null) return;
		setElapsed(liveGame.gameLength);
		const interval = setInterval(() => {
			setElapsed((prev) => prev + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, [liveGame?.inGame, liveGame?.gameLength]);

	const blueTeam = useMemo(
		() => liveGame?.participants?.filter((p) => p.teamId === 100) ?? [],
		[liveGame?.participants],
	);
	const redTeam = useMemo(
		() => liveGame?.participants?.filter((p) => p.teamId === 200) ?? [],
		[liveGame?.participants],
	);

	const blueBans = useMemo(
		() =>
			liveGame?.bannedChampions?.filter((b) => b.teamId === 100) ?? [],
		[liveGame?.bannedChampions],
	);
	const redBans = useMemo(
		() =>
			liveGame?.bannedChampions?.filter((b) => b.teamId === 200) ?? [],
		[liveGame?.bannedChampions],
	);

	if (accountLoading || liveLoading) return <Loader fullScreen />;
	if (accountError || !account) return null;

	if (!liveGame?.inGame) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
				<p className="text-lg text-muted-foreground">
					Not currently in a game
				</p>
				<BackButton />
			</div>
		);
	}

	const queueName = getQueueName(liveGame.gameQueueConfigId ?? 0);

	return (
		<div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8 lg:px-12">
			<BackButton />

			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
			>
				<Card className="mt-6">
					<CardHeader>
						<CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
							<div>
								<span className="text-xl sm:text-2xl font-bold">
									{queueName}
								</span>
								<span className={`ml-3 text-sm font-semibold ${elapsed < 0 ? "text-yellow-400" : "text-green-400"}`}>
									{elapsed < 0 ? "Champ Select" : "In Game"}
								</span>
							</div>
							<div className="flex items-center gap-4">
								{(() => {
									const avgRank = calculateAvgRank(playerRanks, liveGame.gameQueueConfigId ?? 420);
									if (!avgRank) return null;
									return (
										<div className="flex items-center gap-2">
											<Image
												src={getRankEmblem(avgRank.tier)}
												alt={formatRankLabel(avgRank.tier, avgRank.rank)}
												width={40}
												height={40}
											/>
											<div className="text-center">
												<p className="text-sm font-bold" style={{ color: RANK_COLORS[avgRank.tier] ?? "#888" }}>
													{formatRankLabel(avgRank.tier, avgRank.rank)}
												</p>
												<p className="text-sm text-muted-foreground">Avg Rank</p>
											</div>
										</div>
									);
								})()}
								<div className="flex items-center gap-2">
									<div className="relative size-2.5">
										<div className={`absolute inset-0 rounded-full ${elapsed < 0 ? "bg-yellow-400" : "bg-green-500"}`} />
										<div className={`absolute inset-0 rounded-full animate-ping opacity-50 ${elapsed < 0 ? "bg-yellow-400" : "bg-green-500"}`} />
									</div>
									<span className="text-xl sm:text-2xl font-mono tabular-nums text-muted-foreground">
										{formatTime(elapsed)}
									</span>
								</div>
							</div>
						</CardTitle>
					</CardHeader>
				</Card>
			</motion.div>

			{/* Bans */}
			{(blueBans.length > 0 || redBans.length > 0) && (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.1 }}
					className="mt-6"
				>
					<Card>
						<CardHeader>
							<CardTitle className="text-base font-semibold uppercase tracking-wider text-muted-foreground">
								Bans
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex items-center justify-between">
								{/* Blue bans */}
								<div className="flex gap-2">
									{blueBans.map((ban) => {
										const champ =
											champions?.[ban.championId];
										return (
											<div
												key={`blue-ban-${ban.pickTurn}`}
												className="relative"
											>
												{version && champ ? (
													<Image
														src={getChampionIcon(
															version,
															champ.id,
														)}
														alt={champ.name}
														width={32}
														height={32}
														className="rounded grayscale opacity-60"
													/>
												) : (
													<div className="size-8 rounded-lg bg-muted" />
												)}
											</div>
										);
									})}
								</div>

								{/* Red bans */}
								<div className="flex gap-2">
									{redBans.map((ban) => {
										const champ =
											champions?.[ban.championId];
										return (
											<div
												key={`red-ban-${ban.pickTurn}`}
												className="relative"
											>
												{version && champ ? (
													<Image
														src={getChampionIcon(
															version,
															champ.id,
														)}
														alt={champ.name}
														width={32}
														height={32}
														className="rounded grayscale opacity-60"
													/>
												) : (
													<div className="size-8 rounded-lg bg-muted" />
												)}
											</div>
										);
									})}
								</div>
							</div>
						</CardContent>
					</Card>
				</motion.div>
			)}

			{/* Teams */}
			<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
				{/* Blue Team */}
				<motion.div
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5, delay: 0.2 }}
				>
					<Card>
						<CardHeader>
							<CardTitle className="text-base font-semibold uppercase tracking-wider text-blue-400">
								Blue Team
							</CardTitle>
						</CardHeader>
						<CardContent className="p-0 overflow-x-auto">
							<TeamTable
								participants={blueTeam}
								version={version}
								champions={champions}
								runeData={runeData}
								playerRanks={playerRanks}
								queueId={liveGame.gameQueueConfigId}
							/>
						</CardContent>
					</Card>
				</motion.div>

				{/* Red Team */}
				<motion.div
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5, delay: 0.3 }}
				>
					<Card>
						<CardHeader>
							<CardTitle className="text-base font-semibold uppercase tracking-wider text-red-400">
								Red Team
							</CardTitle>
						</CardHeader>
						<CardContent className="p-0 overflow-x-auto">
							<TeamTable
								participants={redTeam}
								version={version}
								champions={champions}
								runeData={runeData}
								playerRanks={playerRanks}
								queueId={liveGame.gameQueueConfigId}
							/>
						</CardContent>
					</Card>
				</motion.div>
			</div>
		</div>
	);
}

function TeamTable({
	participants,
	version,
	champions,
	runeData,
	playerRanks,
	queueId,
}: {
	participants: NonNullable<
		ReturnType<typeof useLiveGame>["data"]
	>["participants"] extends (infer T)[] | undefined
		? T[]
		: never;
	version: string | undefined;
	champions: Record<number, { id: string; key: string; name: string }> | undefined;
	runeData:
		| {
				runes: Map<number, { id: number; icon: string }>;
				styles: Map<number, { id: number; icon: string }>;
		  }
		| undefined;
	playerRanks?: Record<string, unknown[]>;
	queueId?: number;
}) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Champion</TableHead>
					<TableHead>Player</TableHead>
					<TableHead>Spells</TableHead>
					<TableHead>Runes</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{participants.map((p) => {
					const champ = champions?.[p.championId];
					const keystoneRune = runeData?.runes.get(
						p.perks.perkIds[0],
					);
					const subStyle = runeData?.styles.get(p.perks.perkSubStyle);

				const relevantQueue = queueId === 440 ? "RANKED_FLEX_SR" : "RANKED_SOLO_5x5";
					const rankEntries = playerRanks?.[p.puuid] as { queueType: string; tier: string; rank: string; leaguePoints: number }[] | undefined;
					const rankEntry = rankEntries?.find((e) => e.queueType === relevantQueue);

					return (
						<TableRow key={p.puuid}>
							{/* Champion */}
							<TableCell>
								<div className="flex items-center gap-2">
									{rankEntry ? (
										<Image
											src={getRankEmblem(rankEntry.tier)}
											alt={`${rankEntry.tier} ${rankEntry.rank}`}
											width={28}
											height={28}
											className="shrink-0"
										/>
									) : playerRanks ? (
										<Image
											src={getRankEmblem("unranked")}
											alt="Unranked"
											width={28}
											height={28}
											className="shrink-0 brightness-200"
										/>
									) : null}
									{version && champ ? (
										<Image
											src={getChampionIcon(
												version,
												champ.id,
											)}
											alt={champ.name}
											width={40}
											height={40}
											className="rounded-lg"
										/>
									) : (
										<div className="size-8 rounded-lg bg-muted" />
									)}
									<span className="hidden sm:inline text-base text-muted-foreground">
										{champ?.name}
									</span>
								</div>
							</TableCell>

							{/* Player name */}
							<TableCell>
								<Link
									href={`/summoner/${p.riotId.replace("#", "-")}`}
									className="text-base font-semibold hover:text-primary transition-colors"
								>
									{p.riotId}
								</Link>
							</TableCell>

							{/* Summoner spells */}
							<TableCell>
								<div className="flex gap-1">
									{version && (
										<>
											<Image
												src={getSummonerSpellIcon(
													version,
													p.spell1Id,
												)}
												alt="Spell 1"
												width={24}
												height={24}
												className="rounded"
											/>
											<Image
												src={getSummonerSpellIcon(
													version,
													p.spell2Id,
												)}
												alt="Spell 2"
												width={24}
												height={24}
												className="rounded"
											/>
										</>
									)}
								</div>
							</TableCell>

							{/* Runes */}
							<TableCell>
								<div className="flex gap-1">
									{keystoneRune && (
										<Image
											src={getRuneIcon(
												keystoneRune.icon,
											)}
											alt="Keystone"
											width={20}
											height={20}
										/>
									)}
									{subStyle && (
										<Image
											src={getRuneIcon(subStyle.icon)}
											alt="Secondary"
											width={20}
											height={20}
										/>
									)}
								</div>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
