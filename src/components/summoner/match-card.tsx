"use client";

import { useState } from "react";
import { type Participant } from "@/lib/validators/match";
import { type RankedEntry } from "@/lib/validators/ranked";
import {
	getChampionIcon,
	getChampionDisplayName,
	getItemIcon,
	getSummonerSpellIcon,
	getRuneIcon,
	getRankEmblem,
	type RuneData,
	type RuneStyle,
} from "@/lib/icon-helpers";
import { usePlayerRanks } from "@/hooks/usePlayerRanks";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface MatchCardProps {
	matchId: string;
	player: Participant;
	participants: Participant[];
	queueName: string;
	queueId: number;
	gameDuration: number;
	gameCreation: number;
	version?: string;
	index: number;
	runeData?: { runes: Map<number, RuneData>; styles: Map<number, RuneStyle> };
}

function formatDuration(seconds: number): string {
	const min = Math.floor(seconds / 60);
	const sec = seconds % 60;
	return `${min}:${sec.toString().padStart(2, "0")}`;
}

function timeAgo(timestamp: number): string {
	const diff = Date.now() - timestamp;
	const minutes = Math.floor(diff / (1000 * 60));
	if (minutes < 5) return "Just now";
	if (minutes < 60) return `${Math.floor(minutes / 5) * 5}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

function formatGold(gold: number): string {
	return gold >= 1000 ? `${(gold / 1000).toFixed(1)}k` : gold.toString();
}

function getRankLabel(entry: RankedEntry): string {
	const tier = entry.tier.charAt(0) + entry.tier.slice(1).toLowerCase();
	const isApex = ["MASTER", "GRANDMASTER", "CHALLENGER"].includes(entry.tier);
	return isApex ? `${tier} ${entry.leaguePoints} LP` : `${tier} ${entry.rank}`;
}

function PlayerRow({
	p,
	isCurrentPlayer,
	version,
	gameDuration,
	rankEntry,
	runeData,
}: {
	p: Participant;
	isCurrentPlayer: boolean;
	version?: string;
	gameDuration: number;
	rankEntry?: RankedEntry;
	runeData?: { runes: Map<number, RuneData>; styles: Map<number, RuneStyle> };
}) {
	const primaryStyle = p.perks.styles[0];
	const secondaryStyle = p.perks.styles[1];
	const keystoneId = primaryStyle?.selections[0]?.perk;
	const keystoneRune = keystoneId && runeData ? runeData.runes.get(keystoneId) : null;
	const subStyle = secondaryStyle && runeData ? runeData.styles.get(secondaryStyle.style) : null;

	return (
		<div
			className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${
				isCurrentPlayer ? "bg-primary/10 ring-1 ring-primary/30" : ""
			}`}
		>
			{/* Champion icon */}
			{version && (
				<Image
					src={getChampionIcon(version, p.championName)}
					alt={getChampionDisplayName(p.championName)}
					width={24}
					height={24}
					className="rounded shrink-0"
				/>
			)}
			{/* Spells + Runes (desktop only) */}
			{version && (
				<div className="hidden sm:flex gap-0.5 shrink-0">
					<div className="flex flex-col gap-0.5">
						<Image
							src={getSummonerSpellIcon(version, p.summoner1Id)}
							alt="Spell 1"
							width={14}
							height={14}
							className="rounded-sm"
						/>
						<Image
							src={getSummonerSpellIcon(version, p.summoner2Id)}
							alt="Spell 2"
							width={14}
							height={14}
							className="rounded-sm"
						/>
					</div>
					<div className="flex flex-col gap-0.5">
						{keystoneRune && (
							<Image
								src={getRuneIcon(keystoneRune.icon)}
								alt={keystoneRune.name}
								width={14}
								height={14}
								className="rounded-sm"
							/>
						)}
						{subStyle && (
							<Image
								src={getRuneIcon(subStyle.icon)}
								alt={subStyle.name}
								width={14}
								height={14}
								className="rounded-sm opacity-60"
							/>
						)}
					</div>
				</div>
			)}
			{/* Rank emblem */}
			<div className="shrink-0 w-7 flex items-center justify-center">
				{rankEntry ? (
					<Image
						src={getRankEmblem(rankEntry.tier)}
						alt={getRankLabel(rankEntry)}
						title={getRankLabel(rankEntry)}
						width={28}
						height={28}
						className="shrink-0"
					/>
				) : (
					<div className="size-7 rounded-full bg-muted/30" />
				)}
			</div>
			{/* Player name */}
			<span className="truncate min-w-0 flex-1 font-medium">
				{p.riotIdGameName}
			</span>
			{/* KDA */}
			<span className="font-mono shrink-0 w-16 text-right">
				{p.kills}/{p.deaths}/{p.assists}
			</span>
			{/* CS (desktop) */}
			<span className="hidden sm:block text-muted-foreground shrink-0 w-16 text-right">
				{p.totalMinionsKilled + p.neutralMinionsKilled} ({((p.totalMinionsKilled + p.neutralMinionsKilled) / (gameDuration / 60)).toFixed(1)})
			</span>
			{/* Gold */}
			<span className="text-muted-foreground shrink-0 w-12 text-right">
				{formatGold(p.goldEarned)}
			</span>
			{/* Damage (desktop) */}
			<span className="hidden sm:block text-muted-foreground shrink-0 w-12 text-right">
				{formatGold(p.totalDamageDealtToChampions)}
			</span>
		</div>
	);
}

export default function MatchCard({
	matchId,
	player,
	participants,
	queueName,
	queueId,
	gameDuration,
	gameCreation,
	version,
	index,
	runeData,
}: MatchCardProps) {
	const [expanded, setExpanded] = useState(false);

	// Only fetch ranks when expanded
	const puuids = expanded ? participants.map((p) => p.puuid) : undefined;
	const { data: playerRanks } = usePlayerRanks(puuids);

	const relevantQueue = queueId === 440 ? "RANKED_FLEX_SR" : "RANKED_SOLO_5x5";

	const kda =
		player.deaths === 0
			? "Perfect"
			: ((player.kills + player.assists) / player.deaths).toFixed(1);

	const itemIds = [
		player.item0,
		player.item1,
		player.item2,
		player.item3,
		player.item4,
		player.item5,
		player.item6,
	];

	const blueTeam = participants.filter((p) => p.teamId === 100);
	const redTeam = participants.filter((p) => p.teamId === 200);

	function getRankForPlayer(puuid: string): RankedEntry | undefined {
		if (!playerRanks) return undefined;
		const entries = playerRanks[puuid];
		return entries?.find((e) => e.queueType === relevantQueue);
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, delay: index * 0.04 }}
			className={`rounded-xl border overflow-hidden transition-colors ${
				player.win ? "border-win/15 bg-win/5" : "border-loss/15 bg-loss/5"
			}`}
		>
			{/* Clickable card header */}
			<div
				onClick={() => setExpanded((prev) => !prev)}
				className="cursor-pointer transition-all hover:bg-accent/20 hover:scale-[1.005] duration-150"
			>
				{/* Desktop: Three-section layout */}
				<div className="hidden sm:flex items-stretch">
					{/* Section 1: Identity */}
					<div className="flex items-center gap-3 px-4 py-3 min-w-[230px] border-r border-white/5">
						<div
							className={`w-1 self-stretch rounded-full shrink-0 ${
								player.win ? "bg-win" : "bg-loss"
							}`}
						/>
						{version && (
							<div className="flex gap-1 shrink-0">
								<div className="flex flex-col gap-0.5">
									<Image
										src={getSummonerSpellIcon(version, player.summoner1Id)}
										alt="Spell 1"
										width={18}
										height={18}
										className="rounded"
									/>
									<Image
										src={getSummonerSpellIcon(version, player.summoner2Id)}
										alt="Spell 2"
										width={18}
										height={18}
										className="rounded"
									/>
								</div>
								<div className="flex flex-col gap-0.5">
									{(() => {
										const primaryStyle = player.perks.styles[0];
										const secondaryStyle = player.perks.styles[1];
										const keystoneId = primaryStyle?.selections[0]?.perk;
										const keystoneRune =
											keystoneId && runeData
												? runeData.runes.get(keystoneId)
												: null;
										const subStyle =
											secondaryStyle && runeData
												? runeData.styles.get(secondaryStyle.style)
												: null;
										return (
											<>
												{keystoneRune && (
													<Image
														src={getRuneIcon(keystoneRune.icon)}
														alt={keystoneRune.name}
														width={18}
														height={18}
														className="rounded"
													/>
												)}
												{subStyle && (
													<Image
														src={getRuneIcon(subStyle.icon)}
														alt={subStyle.name}
														width={18}
														height={18}
														className="rounded opacity-60"
													/>
												)}
											</>
										);
									})()}
								</div>
							</div>
						)}
						{version && (
							<Image
								src={getChampionIcon(version, player.championName)}
								alt={getChampionDisplayName(player.championName)}
								width={48}
								height={48}
								className="rounded-xl shrink-0"
							/>
						)}
						<div className="min-w-0">
							<p className="text-sm font-semibold truncate">
								{getChampionDisplayName(player.championName)}
							</p>
							<p className="text-sm text-muted-foreground">
								Lvl {player.champLevel}
							</p>
						</div>
					</div>

					{/* Section 2: Performance */}
					<div className="flex items-center gap-5 px-5 py-3 flex-1 border-r border-white/5">
						<div className="text-center min-w-[70px]">
							<p className="text-sm font-mono font-bold">
								{player.kills}
								<span className="text-muted-foreground">/</span>
								{player.deaths}
								<span className="text-muted-foreground">/</span>
								{player.assists}
							</p>
							<p
								className={`text-sm font-medium ${
									kda === "Perfect" || parseFloat(kda) >= 3
										? "text-primary"
										: "text-muted-foreground"
								}`}
							>
								{kda} KDA
							</p>
						</div>
						<div className="text-center">
							<p className="text-sm font-medium">{player.totalMinionsKilled}</p>
							<p className="text-sm text-muted-foreground">CS</p>
						</div>
						{version && (
							<div className="flex gap-1">
								{itemIds.map((itemId, i) => {
									const icon = getItemIcon(version, itemId);
									return icon ? (
										<Image
											key={i}
											src={icon}
											alt={`Item ${i}`}
											width={24}
											height={24}
											className="rounded"
										/>
									) : (
										<div key={i} className="size-6 rounded bg-muted/30" />
									);
								})}
							</div>
						)}
					</div>

					{/* Section 3: Game meta + teams */}
					<div className="flex items-center gap-3 px-4 py-3">
						<div className="text-right min-w-[90px]">
							<p className="text-sm font-medium text-foreground">{queueName}</p>
							<p className="text-sm text-muted-foreground">
								{formatDuration(gameDuration)} · {timeAgo(gameCreation)}
							</p>
						</div>
						{version && (
							<div className="hidden lg:flex flex-col gap-0.5 shrink-0">
								<div className="flex gap-0.5">
									{blueTeam.map((p, i) => (
										<Image
											key={`blue-${i}`}
											src={getChampionIcon(version, p.championName)}
											alt={p.championName}
											width={16}
											height={16}
											className={`rounded-sm ${
												p.puuid === player.puuid ? "ring-1 ring-primary" : ""
											} size-4`}
										/>
									))}
								</div>
								<div className="flex gap-0.5">
									{redTeam.map((p, i) => (
										<Image
											key={`red-${i}`}
											src={getChampionIcon(version, p.championName)}
											alt={p.championName}
											width={16}
											height={16}
											className={`rounded-sm ${
												p.puuid === player.puuid ? "ring-1 ring-primary" : ""
											} size-4`}
										/>
									))}
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Mobile layout */}
				<div className="flex sm:hidden flex-col gap-2 p-3">
					{/* Row 1: Champ + KDA + Game info */}
					<div className="flex items-center gap-3">
						<div
							className={`w-1 self-stretch rounded-full shrink-0 ${
								player.win ? "bg-win" : "bg-loss"
							}`}
						/>
						{version && (
							<Image
								src={getChampionIcon(version, player.championName)}
								alt={getChampionDisplayName(player.championName)}
								width={40}
								height={40}
								className="rounded-lg shrink-0"
							/>
						)}
						<div className="flex-1 min-w-0">
							<p className="text-sm font-semibold truncate">
								{getChampionDisplayName(player.championName)}
							</p>
							<p className="text-sm font-mono">
								{player.kills}/{player.deaths}/{player.assists}
								<span
									className={`ml-1.5 text-sm ${
										kda === "Perfect" || parseFloat(kda) >= 3
											? "text-primary"
											: "text-muted-foreground"
									}`}
								>
									{kda}
								</span>
								</p>
						</div>
						<div className="text-right shrink-0">
							<p className="text-sm font-medium">{queueName}</p>
							<p className="text-sm text-muted-foreground">
								{formatDuration(gameDuration)} · {timeAgo(gameCreation)}
							</p>
						</div>
					</div>
					{/* Row 2: Items */}
					{version && (
						<div className="flex gap-1 ml-6">
							{itemIds.map((itemId, i) => {
								const icon = getItemIcon(version, itemId);
								return icon ? (
									<Image
										key={i}
										src={icon}
										alt={`Item ${i}`}
										width={22}
										height={22}
										className="rounded"
									/>
								) : (
									<div key={i} className="size-[22px] rounded bg-muted/30" />
								);
							})}
						</div>
					)}
				</div>
			</div>

			{/* Expanded scoreboard */}
			<AnimatePresence>
				{expanded && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="overflow-hidden"
					>
						<div className="border-t border-white/5 px-3 py-3 space-y-3">
							{/* Column headers */}
							<div className="flex items-center gap-1.5 px-2 text-[10px] uppercase tracking-wider text-muted-foreground">
								<span className="w-6" />
								<span className="hidden sm:block w-8" />
								<span className="w-5" />
								<span className="flex-1">Player</span>
								<span className="w-16 text-right">KDA</span>
								<span className="hidden sm:block w-16 text-right">CS (m)</span>
								<span className="w-12 text-right">Gold</span>
								<span className="hidden sm:block w-12 text-right">Dmg</span>
							</div>

							{/* Blue team */}
							<div className="space-y-0.5">
								<p className="text-sm uppercase tracking-wider font-semibold text-blue-400 px-2">
									Blue Team · <span className={blueTeam[0]?.win ? "text-win" : "text-loss"}>
										{blueTeam[0]?.win ? "Victory" : "Defeat"}
									</span>
								</p>
								{blueTeam.map((p) => (
									<PlayerRow
										key={p.puuid}
										p={p}
										isCurrentPlayer={p.puuid === player.puuid}
										version={version}
										gameDuration={gameDuration}
										rankEntry={getRankForPlayer(p.puuid)}
										runeData={runeData}
									/>
								))}
							</div>

							{/* Red team */}
							<div className="space-y-0.5">
								<p className="text-sm uppercase tracking-wider font-semibold text-red-400 px-2">
									Red Team · <span className={redTeam[0]?.win ? "text-win" : "text-loss"}>
										{redTeam[0]?.win ? "Victory" : "Defeat"}
									</span>
								</p>
								{redTeam.map((p) => (
									<PlayerRow
										key={p.puuid}
										p={p}
										isCurrentPlayer={p.puuid === player.puuid}
										version={version}
										gameDuration={gameDuration}
										rankEntry={getRankForPlayer(p.puuid)}
										runeData={runeData}
									/>
								))}
							</div>

							{/* View full details link */}
							<Link
								href={`/match/${matchId}`}
								onClick={(e) => e.stopPropagation()}
								className="block text-center text-xs text-primary hover:text-primary/80 font-medium py-1 transition-colors"
							>
								View Full Details →
							</Link>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
}
