"use client";

import { type Participant } from "@/lib/validators/match";
import { getChampionIcon } from "@/lib/icon-helpers";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface MatchCardProps {
	matchId: string;
	player: Participant;
	queueName: string;
	gameDuration: number;
	gameCreation: number;
	version?: string;
	index: number;
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
	queueName,
	gameDuration,
	gameCreation,
	version,
	index,
}: MatchCardProps) {
	const kda =
		player.deaths === 0
			? "Perfect"
			: ((player.kills + player.assists) / player.deaths).toFixed(1);

	return (
		<Link href={`/match/${matchId}`}>
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3, delay: index * 0.04 }}
				className={`group flex items-center gap-5 rounded-xl border px-5 py-4 transition-all hover:bg-accent/30 hover:scale-105 duration-150 ${
					player.win ? "border-win/15 bg-win/5" : "border-loss/15 bg-loss/5"
				}`}
			>
				{/* Win/Loss bar */}
				<div
					className={`w-1 self-stretch rounded-full ${
						player.win ? "bg-win" : "bg-loss"
					}`}
				/>

				{/* Champion icon */}
				{version && (
					<Image
						src={getChampionIcon(version, player.championName)}
						alt={player.championName}
						width={52}
						height={52}
						className="rounded-xl"
					/>
				)}

				{/* Champion info */}
				<div className="min-w-[110px]">
					<p className="text-base font-semibold">{player.championName}</p>
					<p className="text-sm text-muted-foreground">
						Lvl {player.champLevel}
					</p>
				</div>

				{/* KDA */}
				<div className="min-w-[110px] text-center">
					<p className="text-base font-mono font-bold">
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

				{/* CS */}
				<div className="min-w-[60px] text-center">
					<p className="text-base font-medium">{player.totalMinionsKilled}</p>
					<p className="text-sm text-muted-foreground">CS</p>
				</div>

				<div className="flex-1" />

				{/* Game info */}
				<div className="text-right">
					<p className="text-sm font-medium text-foreground">{queueName}</p>
					<p className="text-sm text-muted-foreground">
						{formatDuration(gameDuration)} · {timeAgo(gameCreation)}
					</p>
				</div>

				{/* Result */}
				<div
					className={`w-12 rounded-lg py-1.5 text-center text-sm font-bold ${
						player.win ? "bg-win/15 text-win" : "bg-loss/15 text-loss"
					}`}
				>
					{player.win ? "W" : "L"}
				</div>
			</motion.div>
		</Link>
	);
}
