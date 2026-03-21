"use client";

import { type Participant } from "@/lib/validators/match";
import { type Timeline } from "@/lib/validators/timeline";
import { motion } from "framer-motion";
import { getRuneIcon, type RuneData, type RuneStyle } from "@/lib/icon-helpers";
import Image from "next/image";
import SkillOrder from "./skill-order";
import ItemBuild from "./item-build";
import KillMap from "./kill-map";

interface PlayerDetailsProps {
	player: Participant;
	gameDuration: number;
	runeData?: { runes: Map<number, RuneData>; styles: Map<number, RuneStyle> };
	timeline?: Timeline;
	version?: string;
	participantId: number;
	itemNames?: Map<number, string>;
}

function formatTime(seconds: number): string {
	const min = Math.floor(seconds / 60);
	const sec = seconds % 60;
	return `${min}:${sec.toString().padStart(2, "0")}`;
}

function Stat({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="flex items-center justify-between py-1">
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className="text-sm font-medium tabular-nums">{value}</span>
		</div>
	);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<p className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground/70">
			{children}
		</p>
	);
}

export default function PlayerDetails({
	player,
	gameDuration,
	timeline,
	version,
	participantId,
	itemNames,
	runeData,
}: PlayerDetailsProps) {
	const mins = gameDuration / 60;
	const csTotal = player.totalMinionsKilled + player.neutralMinionsKilled;
	const csPerMin = (csTotal / mins).toFixed(1);
	const dmgPerMin = (player.totalDamageDealtToChampions / mins).toFixed(0);
	const goldPerMin = (player.goldEarned / mins).toFixed(0);

	const multikills = [
		player.doubleKills > 0 && `${player.doubleKills}× Double`,
		player.tripleKills > 0 && `${player.tripleKills}× Triple`,
		player.quadraKills > 0 && `${player.quadraKills}× Quadra`,
		player.pentaKills > 0 && `${player.pentaKills}× Penta`,
	].filter(Boolean);

	return (
		<motion.div
			initial={{ opacity: 0, height: 0 }}
			animate={{ opacity: 1, height: "auto" }}
			exit={{ opacity: 0, height: 0 }}
			transition={{ duration: 0.25 }}
			className="overflow-hidden"
		>
			<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5 lg:gap-8 p-6">
				<div>
					<SectionTitle>Damage</SectionTitle>
					<Stat
						label="To Champions"
						value={player.totalDamageDealtToChampions.toLocaleString()}
					/>
					<Stat
						label="Physical"
						value={player.physicalDamageDealtToChampions.toLocaleString()}
					/>
					<Stat
						label="Magic"
						value={player.magicDamageDealtToChampions.toLocaleString()}
					/>
					<Stat
						label="True"
						value={player.trueDamageDealtToChampions.toLocaleString()}
					/>
					<Stat label="DPM" value={dmgPerMin} />
				</div>

				<div>
					<SectionTitle>Survivability</SectionTitle>
					<Stat
						label="Damage Taken"
						value={player.totalDamageTaken.toLocaleString()}
					/>
					<Stat
						label="Self Mitigated"
						value={player.damageSelfMitigated.toLocaleString()}
					/>
					<Stat
						label="Healing"
						value={player.totalHeal.toLocaleString()}
					/>
					<Stat
						label="Shielded Allies"
						value={player.totalDamageShieldedOnTeammates.toLocaleString()}
					/>
					<Stat
						label="Healed Allies"
						value={player.totalHealsOnTeammates.toLocaleString()}
					/>
				</div>

				<div>
					<SectionTitle>Income & Vision</SectionTitle>
					<Stat
						label="Gold"
						value={player.goldEarned.toLocaleString()}
					/>
					<Stat label="Gold/min" value={goldPerMin} />
					<Stat label="CS" value={csTotal} />
					<Stat label="CS/min" value={csPerMin} />
					<Stat label="Vision Score" value={player.visionScore} />
					<Stat label="Wards Placed" value={player.wardsPlaced} />
					<Stat label="Wards Killed" value={player.wardsKilled} />
					<Stat
						label="Control Wards"
						value={player.visionWardsBoughtInGame}
					/>
				</div>

				<div>
					<SectionTitle>Runes</SectionTitle>
					{runeData && (() => {
						const primaryStyle = player.perks.styles.find(s => s.description === "primaryStyle");
						const secondaryStyle = player.perks.styles.find(s => s.description === "subStyle");
						const primaryInfo = primaryStyle && runeData.styles.get(primaryStyle.style);
						const secondaryInfo = secondaryStyle && runeData.styles.get(secondaryStyle.style);
						return (
							<div className="space-y-3">
								{primaryInfo && (
									<div>
										<p className="text-sm font-semibold text-muted-foreground mb-1.5">{primaryInfo.name}</p>
										<div className="space-y-1">
											{primaryStyle.selections.map((sel) => {
												const rune = runeData.runes.get(sel.perk);
												if (!rune) return null;
												return (
													<div key={sel.perk} className="flex items-center gap-2">
														<Image
															src={getRuneIcon(rune.icon)}
															alt={rune.name}
															width={24}
															height={24}
														/>
														<span className="text-sm">{rune.name}</span>
													</div>
												);
											})}
										</div>
									</div>
								)}
								{secondaryInfo && (
									<div>
										<p className="text-sm font-semibold text-muted-foreground mb-1.5">{secondaryInfo.name}</p>
										<div className="space-y-1">
											{secondaryStyle!.selections.map((sel) => {
												const rune = runeData.runes.get(sel.perk);
												if (!rune) return null;
												return (
													<div key={sel.perk} className="flex items-center gap-2">
														<Image
															src={getRuneIcon(rune.icon)}
															alt={rune.name}
															width={24}
															height={24}
														/>
														<span className="text-sm">{rune.name}</span>
													</div>
												);
											})}
										</div>
									</div>
								)}
							</div>
						);
					})()}
				</div>

				<div>
					<SectionTitle>Combat & Objectives</SectionTitle>
					<Stat
						label="Largest Spree"
						value={player.largestKillingSpree}
					/>
					{multikills.length > 0 && (
						<Stat
							label="Multikills"
							value={multikills.join(", ")}
						/>
					)}
					<Stat label="Turrets" value={player.turretKills} />
					<Stat label="Dragons" value={player.dragonKills} />
					<Stat label="Barons" value={player.baronKills} />
					<Stat
						label="CC Time"
						value={formatTime(player.timeCCingOthers)}
					/>
					<Stat
						label="Time Dead"
						value={formatTime(player.totalTimeSpentDead)}
					/>
					{player.firstBloodKill && (
						<Stat label="First Blood" value="✓" />
					)}
					{player.firstTowerKill && (
						<Stat label="First Tower" value="✓" />
					)}
				</div>
			</div>

				{/* Skill Order + Kill Map */}
				<div className="px-6 pb-6 pt-2 flex flex-col lg:flex-row gap-6">
					<div className="flex-1">
						<SectionTitle>Skill Order</SectionTitle>
						<SkillOrder timeline={timeline} participantId={participantId} />
					</div>
					<div className="shrink-0">
						<SectionTitle>Kill Map</SectionTitle>
						<KillMap timeline={timeline} participantId={participantId} version={version} />
					</div>
				</div>

				{/* Item Build */}
				<div className="px-6 pb-6 pt-2">
					<SectionTitle>Item Build Order</SectionTitle>
					<ItemBuild timeline={timeline} participantId={participantId} version={version} itemNames={itemNames} />
				</div>
		</motion.div>
	);
}
