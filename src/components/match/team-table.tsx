"use client";

import { Fragment, useState } from "react";
import { type Participant } from "@/lib/validators/match";
import { getChampionIcon, getItemIcon, getSummonerSpellIcon, getRuneIcon, type RuneData, type RuneStyle } from "@/lib/icon-helpers";
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

import { type Timeline } from "@/lib/validators/timeline";

interface TeamTableProps {
	participants: Participant[];
	teamLabel: string;
	won: boolean;
	version?: string;
	gameDuration: number;
	runeData?: { runes: Map<number, RuneData>; styles: Map<number, RuneStyle> };
	timeline?: Timeline;
	itemNames?: Map<number, string>;
	bans?: { championId: number; pickTurn: number }[];
	champions?: Record<number, { id: string; name: string }>;
}

export default function TeamTable({
	participants,
	teamLabel,
	won,
	version,
	gameDuration,
	runeData,
	timeline,
	itemNames,
	bans,
	champions,
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
			{bans && bans.length > 0 && version && champions && (
				<div className="mb-3 flex items-center gap-2">
					<span className="text-sm font-semibold text-muted-foreground">Bans:</span>
					<div className="flex flex-wrap items-center gap-1.5">
						{bans.map((ban) => {
							const champ = champions[ban.championId];
							if (!champ) return (
								<div
									key={ban.pickTurn}
									className="size-9 rounded-lg bg-muted/50"
								/>
							);
							return (
								<Image
									key={ban.pickTurn}
									src={getChampionIcon(version, champ.id)}
									alt={champ.name}
									width={36}
									height={36}
									className="rounded-lg opacity-50 grayscale-[30%] border border-red-500/40"
								/>
							);
						})}
					</div>
				</div>
			)}
			<div className="rounded-xl border overflow-hidden bg-card overflow-x-auto">
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
							<TableHead className="text-center w-[100px] text-sm hidden md:table-cell">
								Gold
							</TableHead>
							<TableHead className="text-center w-[100px] text-sm hidden md:table-cell">
								Damage
							</TableHead>
							<TableHead className="text-sm hidden md:table-cell">Items</TableHead>
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
								<Fragment key={p.puuid}>
									<TableRow
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
												{version && (
													<div className="flex items-center gap-1">
														<div className="flex flex-col gap-0.5">
															<Image
																src={getSummonerSpellIcon(version, p.summoner1Id)}
																alt="Spell 1"
																width={20}
																height={20}
																className="rounded"
															/>
															<Image
																src={getSummonerSpellIcon(version, p.summoner2Id)}
																alt="Spell 2"
																width={20}
																height={20}
																className="rounded"
															/>
														</div>
														{(() => {
															const primaryStyle = p.perks.styles[0];
															const secondaryStyle = p.perks.styles[1];
															const keystoneId = primaryStyle?.selections[0]?.perk;
															const keystoneRune = keystoneId && runeData ? runeData.runes.get(keystoneId) : null;
															const subStyle = secondaryStyle && runeData ? runeData.styles.get(secondaryStyle.style) : null;
															return (
																<div className="flex flex-col gap-0.5">
																	{keystoneRune && (
																		<Image
																			src={getRuneIcon(keystoneRune.icon)}
																			alt={keystoneRune.name}
																			width={20}
																			height={20}
																			className="rounded"
																		/>
																	)}
																	{subStyle && (
																		<Image
																			src={getRuneIcon(subStyle.icon)}
																			alt={subStyle.name}
																			width={20}
																			height={20}
																			className="rounded opacity-60"
																		/>
																	)}
																</div>
															);
														})()}
													</div>
												)}
												<div>
													<Link
														href={`/summoner/${p.riotIdGameName}-${p.riotIdTagline}`}
														className="text-sm font-semibold hover:text-primary transition-colors"
														onClick={(e) => e.stopPropagation()}
													>
														{p.riotIdGameName}
														<span className="ml-1 text-sm text-muted-foreground">
															#{p.riotIdTagline}
														</span>
													</Link>
													<p className="text-sm text-muted-foreground">
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
											<p className="text-sm text-muted-foreground">
												{kda} KDA
											</p>
										</TableCell>
										<TableCell className="text-center text-sm font-medium">
											{p.totalMinionsKilled +
												p.neutralMinionsKilled}
										</TableCell>
										<TableCell className="text-center text-sm font-medium hidden md:table-cell">
											{(
												p.goldEarned / 1000
											).toFixed(1)}
											k
										</TableCell>
										<TableCell className="text-center text-sm font-medium hidden md:table-cell">
											{(
												p.totalDamageDealtToChampions /
												1000
											).toFixed(1)}
											k
										</TableCell>
										<TableCell className="hidden md:table-cell">
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
													runeData={runeData}
													timeline={timeline}
													version={version}
													participantId={participants.indexOf(p) + (teamLabel === "Blue Team" ? 1 : 6)}
													itemNames={itemNames}
												/>
											</TableCell>
										</TableRow>
									)}
								</Fragment>
							);
						})}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
