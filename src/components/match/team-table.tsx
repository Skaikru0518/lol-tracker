"use client";

import { useState } from "react";
import { type Participant } from "@/lib/validators/match";
import { getChampionIcon, getItemIcon } from "@/lib/icon-helpers";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import Link from "next/link";
import PlayerDetails from "./player-details";

interface TeamTableProps {
	participants: Participant[];
	teamLabel: string;
	won: boolean;
	version?: string;
	gameDuration: number;
}

export default function TeamTable({
	participants,
	teamLabel,
	won,
	version,
	gameDuration,
}: TeamTableProps) {
	const [expanded, setExpanded] = useState<string | null>(null);
	const itemSlots = [0, 1, 2, 3, 4, 5, 6] as const;

	return (
		<div>
			<div className="mb-4 flex items-center gap-2.5 text-base font-bold">
				<div
					className={`size-3 rounded-full ${
						teamLabel === "Blue Team" ? "bg-cyan-500" : "bg-red-500"
					}`}
				/>
				<span className={teamLabel === "Blue Team" ? "text-cyan-400" : "text-red-400"}>
					{teamLabel}
				</span>
				<span className="text-muted-foreground">—</span>
				<span className={won ? "text-win" : "text-loss"}>
					{won ? "Victory" : "Defeat"}
				</span>
			</div>
			<div className="rounded-xl border overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="hover:bg-transparent">
							<TableHead className="w-[280px] text-sm">
								Player
							</TableHead>
							<TableHead className="text-center w-[140px] text-sm">
								KDA
							</TableHead>
							<TableHead className="text-center w-[100px] text-sm">
								CS
							</TableHead>
							<TableHead className="text-center w-[100px] text-sm">
								Gold
							</TableHead>
							<TableHead className="text-center w-[100px] text-sm">
								Damage
							</TableHead>
							<TableHead className="text-sm">Items</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{participants.map((p) => {
							const kda =
								p.deaths === 0
									? "Perfect"
									: (
											(p.kills + p.assists) /
											p.deaths
										).toFixed(1);
							const isExpanded = expanded === p.puuid;

							return (
								<>
									<TableRow
										key={p.puuid}
										className="cursor-pointer transition-colors hover:bg-accent/30 h-16"
										onClick={() =>
											setExpanded(
												isExpanded ? null : p.puuid,
											)
										}
									>
										<TableCell>
											<div className="flex items-center gap-3">
												{version && (
													<Image
														src={getChampionIcon(
															version,
															p.championName,
														)}
														alt={p.championName}
														width={44}
														height={44}
														className="rounded-xl"
													/>
												)}
												<div>
													<Link
														href={`/summoner/${p.riotIdGameName}-${p.riotIdTagline}`}
														className="text-sm font-semibold hover:text-primary transition-colors"
														onClick={(e) => e.stopPropagation()}
													>
														{p.riotIdGameName}
														<span className="ml-1 text-xs text-muted-foreground">
															#{p.riotIdTagline}
														</span>
													</Link>
													<p className="text-xs text-muted-foreground">
														{p.championName} · Lvl{" "}
														{p.champLevel}
													</p>
												</div>
											</div>
										</TableCell>
										<TableCell className="text-center">
											<p className="text-sm font-mono font-bold">
												{p.kills}
												<span className="text-muted-foreground">
													/
												</span>
												{p.deaths}
												<span className="text-muted-foreground">
													/
												</span>
												{p.assists}
											</p>
											<p className="text-xs text-muted-foreground">
												{kda} KDA
											</p>
										</TableCell>
										<TableCell className="text-center text-sm font-medium">
											{p.totalMinionsKilled +
												p.neutralMinionsKilled}
										</TableCell>
										<TableCell className="text-center text-sm font-medium">
											{(
												p.goldEarned / 1000
											).toFixed(1)}
											k
										</TableCell>
										<TableCell className="text-center text-sm font-medium">
											{(
												p.totalDamageDealtToChampions /
												1000
											).toFixed(1)}
											k
										</TableCell>
										<TableCell>
											<div className="flex gap-1">
												{itemSlots.map((slot) => {
													const itemId =
														p[`item${slot}`];
													const iconUrl =
														version && itemId
															? getItemIcon(
																	version,
																	itemId,
																)
															: null;
													return iconUrl ? (
														<Image
															key={slot}
															src={iconUrl}
															alt={`Item ${itemId}`}
															width={32}
															height={32}
															className="rounded-md"
														/>
													) : (
														<div
															key={slot}
															className="size-8 rounded-md bg-muted/50"
														/>
													);
												})}
											</div>
										</TableCell>
									</TableRow>
									{isExpanded && (
										<TableRow
											key={`${p.puuid}-details`}
											className="hover:bg-transparent"
										>
											<TableCell
												colSpan={6}
												className="p-0 bg-accent/10"
											>
												<PlayerDetails
													player={p}
													gameDuration={gameDuration}
												/>
											</TableCell>
										</TableRow>
									)}
								</>
							);
						})}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
