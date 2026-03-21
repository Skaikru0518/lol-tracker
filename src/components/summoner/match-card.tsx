"use client";

import { type Participant } from "@/lib/validators/match";
import {
	getChampionIcon,
	getItemIcon,
	getSummonerSpellIcon,
	getRuneIcon,
	type RuneData,
	type RuneStyle,
} from "@/lib/icon-helpers";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface MatchCardProps {
	matchId: string;
	player: Participant;
	participants: Participant[];
	queueName: string;
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
	const hours = Math.floor(diff / (1000 * 60 * 60));
	if (hours < 1) return "Just now";
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

export default function MatchCard({
	matchId,
	player,
	participants,
	queueName,
	gameDuration,
	gameCreation,
	version,
	index,
	runeData,
}: MatchCardProps) {
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

	const blueTeam = participants.slice(0, 5);
	const redTeam = participants.slice(5, 10);

	return (
		<Link href={`/match/${matchId}`}>
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3, delay: index * 0.04 }}
				className={`group rounded-xl border overflow-hidden transition-all hover:bg-accent/20 hover:scale-[1.01] duration-150 ${
					player.win
						? "border-win/15 bg-win/5"
						: "border-loss/15 bg-loss/5"
				}`}
			>
				{/* Desktop: Three-section layout */}
				<div className="hidden sm:flex items-stretch">
					{/* Section 1: Identity */}
					<div className="flex items-center gap-3 px-4 py-3 min-w-[200px] border-r border-white/5">
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
										const keystoneRune = keystoneId && runeData ? runeData.runes.get(keystoneId) : null;
										const subStyle = secondaryStyle && runeData ? runeData.styles.get(secondaryStyle.style) : null;
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
								alt={player.championName}
								width={48}
								height={48}
								className="rounded-xl shrink-0"
							/>
						)}
						<div className="min-w-0">
							<p className="text-sm font-semibold truncate">
								{player.championName}
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
							<p className="text-sm font-medium">
								{player.totalMinionsKilled}
							</p>
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
										<div
											key={i}
											className="size-6 rounded bg-muted/30"
										/>
									);
								})}
							</div>
						)}
					</div>

					{/* Section 3: Game meta + teams */}
					<div className="flex items-center gap-3 px-4 py-3">
						<div className="text-right min-w-[90px]">
							<p className="text-sm font-medium text-foreground">
								{queueName}
							</p>
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
												p.puuid === player.puuid
													? "ring-1 ring-primary"
													: ""
											}`}
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
												p.puuid === player.puuid
													? "ring-1 ring-primary"
													: ""
											}`}
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
								alt={player.championName}
								width={40}
								height={40}
								className="rounded-lg shrink-0"
							/>
						)}
						<div className="flex-1 min-w-0">
							<p className="text-sm font-semibold truncate">
								{player.championName}
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
									<div
										key={i}
										className="size-[22px] rounded bg-muted/30"
									/>
								);
							})}
						</div>
					)}
				</div>
			</motion.div>
		</Link>
	);
}
