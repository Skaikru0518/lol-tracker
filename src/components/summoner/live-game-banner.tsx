"use client";

import { useState, useEffect } from "react";
import { useLiveGame } from "@/hooks/useLiveGame";
import { getQueueName } from "@/lib/queue-names";
import { getChampionIcon, type Champion } from "@/lib/icon-helpers";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface LiveGameBannerProps {
	puuid: string;
	summonerSlug: string;
	version?: string;
	champions?: Record<number, Champion>;
}

function formatDuration(seconds: number): string {
	const mins = Math.floor(Math.abs(seconds) / 60);
	const secs = Math.abs(seconds) % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function LiveGameBanner({
	puuid,
	summonerSlug,
	version,
	champions,
}: LiveGameBannerProps) {
	const { data, isLoading } = useLiveGame(puuid);
	const [elapsed, setElapsed] = useState<number>(0);

	useEffect(() => {
		if (data?.gameLength !== undefined) {
			setElapsed(data.gameLength);
		}
	}, [data?.gameLength]);

	useEffect(() => {
		if (!data?.inGame || data?.gameLength === undefined) return;

		const interval = setInterval(() => {
			setElapsed((prev) => prev + 1);
		}, 1000);

		return () => clearInterval(interval);
	}, [data?.inGame, data?.gameLength]);

	if (isLoading || !data?.inGame) return null;

	const blueTeam =
		data.participants?.filter((p) => p.teamId === 100) ?? [];
	const redTeam =
		data.participants?.filter((p) => p.teamId === 200) ?? [];
	const isChampSelect = elapsed < 0;
	const currentPlayer = data.participants?.find((p) => p.puuid === puuid);
	const bans = data.bannedChampions?.filter((b) => b.championId > 0) ?? [];

	return (
		<Link href={`/summoner/${summonerSlug}/live`}>
			<motion.div
				initial={{ opacity: 0, y: -10, height: 0 }}
				animate={{ opacity: 1, y: 0, height: "auto" }}
				transition={{ duration: 0.4, ease: "easeOut" }}
				className="mb-4 overflow-hidden rounded-xl bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent border border-green-500/15 cursor-pointer hover:border-green-500/30 transition-colors"
			>
				<div className="flex items-center gap-4 px-5 py-3">
					{/* Left: Status + Timer */}
					<div className="flex flex-col items-center gap-1 min-w-[60px]">
						<div className="flex items-center gap-2">
							<div className="relative size-2.5">
								<div className={`absolute inset-0 rounded-full ${isChampSelect ? "bg-yellow-400" : "bg-green-500"}`} />
								<div className={`absolute inset-0 rounded-full animate-ping opacity-50 ${isChampSelect ? "bg-yellow-400" : "bg-green-500"}`} />
							</div>
							<span className={`text-sm font-extrabold tracking-wider ${isChampSelect ? "text-yellow-400" : "text-green-400"}`}>
								{isChampSelect ? "CHAMP SELECT" : "IN GAME"}
							</span>
						</div>
						<span className="font-mono text-base text-muted-foreground tabular-nums">
							{formatDuration(elapsed)}
						</span>
					</div>

					<div className="w-px h-10 bg-border/30" />

					{/* Center: Teams or Champ Select */}
					<div className="flex-1 flex flex-col items-center gap-2">
						{isChampSelect ? (
							<span className="text-sm font-semibold text-yellow-400 animate-pulse">
								Champ Select
							</span>
						) : (
							<>
								{version && champions && (
									<>
										<div className="flex items-center gap-3">
											<div className="flex gap-1">
												{blueTeam.map((p) => {
													const champ = champions[p.championId];
													if (!champ) return (
														<div key={p.puuid} className="size-8 rounded-lg bg-blue-900/50" />
													);
													const isCurrentPlayer = p.puuid === puuid;
													return (
														<Image
															key={p.puuid}
															src={getChampionIcon(version, champ.id)}
															alt={champ.name}
															width={32}
															height={32}
															className={`rounded-lg ${
																isCurrentPlayer
																	? "ring-2 ring-cyan-400 shadow-lg shadow-cyan-400/20"
																	: ""
															}`}
														/>
													);
												})}
											</div>
											<span className="text-sm font-bold text-muted-foreground/50">
												VS
											</span>
											<div className="flex gap-1">
												{redTeam.map((p) => {
													const champ = champions[p.championId];
													if (!champ) return (
														<div key={p.puuid} className="size-8 rounded-lg bg-red-900/50" />
													);
													const isCurrentPlayer = p.puuid === puuid;
													return (
														<Image
															key={p.puuid}
															src={getChampionIcon(version, champ.id)}
															alt={champ.name}
															width={32}
															height={32}
															className={`rounded-lg ${
																isCurrentPlayer
																	? "ring-2 ring-cyan-400 shadow-lg shadow-cyan-400/20"
																	: ""
															}`}
														/>
													);
												})}
											</div>
										</div>
										{/* Bans */}
										{bans.length > 0 && (
											<div className="flex items-center gap-1.5">
												<span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Bans</span>
												<div className="flex gap-0.5">
													{bans.filter(b => b.teamId === 100).map((ban) => {
														const champ = champions[ban.championId];
														if (!champ) return null;
														return (
															<Image
																key={`${ban.teamId}-${ban.pickTurn}`}
																src={getChampionIcon(version, champ.id)}
																alt={champ.name}
																width={28}
																height={28}
																className="rounded-md opacity-40 grayscale"
															/>
														);
													})}
												</div>
												<div className="w-px h-3 bg-border/30" />
												<div className="flex gap-0.5">
													{bans.filter(b => b.teamId === 200).map((ban) => {
														const champ = champions[ban.championId];
														if (!champ) return null;
														return (
															<Image
																key={`${ban.teamId}-${ban.pickTurn}`}
																src={getChampionIcon(version, champ.id)}
																alt={champ.name}
																width={28}
																height={28}
																className="rounded-md opacity-40 grayscale"
															/>
														);
													})}
												</div>
											</div>
										)}
									</>
								)}
							</>
						)}
					</div>

					<div className="w-px h-10 bg-border/30" />

					{/* Right: Game mode + link */}
					<div className="text-right min-w-[120px]">
						<p className="text-base font-semibold text-foreground">
							{isChampSelect ? "Champ Select" : "In Game"}
						</p>
						{data.gameQueueConfigId !== undefined && (
							<p className="text-sm text-muted-foreground">
								{getQueueName(data.gameQueueConfigId)}
							</p>
						)}
						<p className="text-sm text-muted-foreground/50 mt-0.5">
							View details →
						</p>
					</div>
				</div>
			</motion.div>
		</Link>
	);
}
