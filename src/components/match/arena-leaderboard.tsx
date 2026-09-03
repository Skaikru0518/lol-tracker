"use client";

import { type Participant } from "@/lib/validators/match";
import { getArenaTeams, getPlacementColor, getPlacementSuffix } from "@/lib/arena-helpers";
import { getChampionIcon, getChampionDisplayName, getItemIcon } from "@/lib/icon-helpers";
import { getMatchBadgeById } from "@/lib/match-badges/definitions";
import Image from "next/image";
import Link from "next/link";
import { toSummonerSlug } from "@/lib/riot-id";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface ArenaLeaderboardProps {
	participants: Participant[];
	version?: string;
	currentPuuid?: string;
	matchBadges?: { puuid: string; badgeId: string }[];
}

function formatGold(gold: number): string {
	return gold >= 1000 ? `${(gold / 1000).toFixed(1)}k` : gold.toString();
}

export default function ArenaLeaderboard({
	participants,
	version,
	currentPuuid,
	matchBadges,
}: ArenaLeaderboardProps) {
	const teams = getArenaTeams(participants);

	return (
		<TooltipProvider delayDuration={200}>
			<div className="rounded-xl border bg-card overflow-hidden">
				{/* Header */}
				<div className="flex items-center gap-4 px-4 py-3 border-b border-border/30 text-xs uppercase tracking-wider text-muted-foreground">
					<span className="w-8">#</span>
					<span className="flex-1">Team</span>
					<span className="w-20 text-center">KDA</span>
					<span className="w-16 text-center hidden md:block">Damage</span>
					<span className="hidden lg:block" style={{ width: "170px" }}>Items</span>
				</div>

				{teams.map((team) => {
					const isPlayerTeam = team.players.some((p) => p.puuid === currentPuuid);
					const isTopHalf = team.placement <= 4;

					return (
						<div key={team.placement}>
							<div
								className={`px-4 py-3 border-b border-border/10 ${
									isPlayerTeam ? "bg-primary/8 ring-1 ring-primary/30 rounded-lg mx-2 my-1" : ""
								} ${!isTopHalf ? "opacity-55" : ""}`}
							>
								<div className="flex items-start gap-4">
									<div className="w-8 flex items-center justify-center pt-2">
										<span
											className="text-lg font-extrabold"
											style={{ color: getPlacementColor(team.placement) }}
										>
											{team.placement}
											<span className="text-[10px] align-super">
												{getPlacementSuffix(team.placement)}
											</span>
										</span>
									</div>
									<div className="flex-1 space-y-2">
										{team.players.map((p) => {
											const isSelf = p.puuid === currentPuuid;
											const playerBadges = matchBadges?.filter((b) => b.puuid === p.puuid) ?? [];

											return (
												<div key={p.puuid} className="flex items-center gap-3">
													{version && (
														<Image
															src={getChampionIcon(version, p.championName)}
															alt={getChampionDisplayName(p.championName)}
															width={40}
															height={40}
															className="rounded-xl shrink-0"
														/>
													)}
													<div className="flex-1 min-w-0">
														<Link
															href={`/summoner/${toSummonerSlug(p.riotIdGameName, p.riotIdTagline)}`}
															className={`text-sm font-semibold hover:text-primary transition-colors ${
																isSelf ? "text-primary" : ""
															}`}
														>
															{p.riotIdGameName}
														</Link>
														<p className="text-xs text-muted-foreground">
															{getChampionDisplayName(p.championName)} · Lvl {p.champLevel}
														</p>
														{playerBadges.length > 0 && (
															<div className="flex gap-1 flex-wrap mt-0.5">
																{playerBadges.map((b) => {
																	const def = getMatchBadgeById(b.badgeId);
																	if (!def) return null;
																	return (
																		<Tooltip key={b.badgeId}>
																			<TooltipTrigger asChild>
																				<span
																					className="rounded-full px-2 py-0.5 text-[10px] font-semibold border cursor-pointer"
																					style={{ color: def.color, borderColor: `${def.color}33`, backgroundColor: `${def.color}10` }}
																				>
																					{def.name}
																				</span>
																			</TooltipTrigger>
																			<TooltipContent><p>{def.description}</p></TooltipContent>
																		</Tooltip>
																	);
																})}
															</div>
														)}
													</div>
													<div className="w-20 text-center">
														<p className="text-sm font-mono font-bold">
															{p.kills}<span className="text-muted-foreground">/</span>
															{p.deaths}<span className="text-muted-foreground">/</span>
															{p.assists}
														</p>
													</div>
													<div className="w-16 text-center hidden md:block">
														<p className="text-sm">{formatGold(p.totalDamageDealtToChampions)}</p>
													</div>
													{version && (
														<div className="hidden lg:flex gap-1">
															{[p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].map((itemId, idx) => {
																const icon = getItemIcon(version, itemId);
																return icon ? (
																	<Image key={idx} src={icon} alt="" width={24} height={24} className="rounded" />
																) : (
																	<div key={idx} className="size-6 rounded bg-muted/50" />
																);
															})}
														</div>
													)}
												</div>
											);
										})}
									</div>
								</div>
							</div>
							{team.placement === 4 && (
								<Separator className="bg-black dark:bg-white/50" />
							)}
						</div>
					);
				})}
			</div>
		</TooltipProvider>
	);
}
