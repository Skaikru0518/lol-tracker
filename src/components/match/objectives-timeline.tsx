"use client";

import { useState } from "react";
import { type Timeline } from "@/lib/validators/timeline";
import { type Participant } from "@/lib/validators/match";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import {
	getObjectiveIcon,
	getBuildingIcon,
	getChampionIcon,
} from "@/lib/icon-helpers";
import IconTooltip from "@/components/ui/icon-tooltip";
import Image from "next/image";
import { useMemo } from "react";

interface ObjectivesTimelineProps {
	timeline?: Timeline;
	participants?: Participant[];
	version?: string;
}

type EventCategory = "objective" | "tower" | "kill";
type FilterType = "all" | "objectives" | "towers" | "kills";

interface GameEvent {
	timestamp: number;
	category: EventCategory;
	label: string;
	icon: string;
	team: "blue" | "red";
	killerId?: number;
	victimId?: number;
}

const MONSTER_LABELS: Record<string, string> = {
	DRAGON: "Dragon",
	RIFTHERALD: "Rift Herald",
	BARON_NASHOR: "Baron Nashor",
	HORDE: "Void Grubs",
	ELDER_DRAGON: "Elder Dragon",
};

const TOWER_LABELS: Record<string, string> = {
	OUTER_TURRET: "T1",
	INNER_TURRET: "T2",
	BASE_TURRET: "T3",
	NEXUS_TURRET: "T4",
};

const LANE_LABELS: Record<string, string> = {
	TOP_LANE: "Top",
	MID_LANE: "Mid",
	BOT_LANE: "Bot",
};

const FILTERS: { label: string; value: FilterType }[] = [
	{ label: "All", value: "all" },
	{ label: "Objectives", value: "objectives" },
	{ label: "Towers", value: "towers" },
	{ label: "Kills", value: "kills" },
];

function formatTime(ms: number): string {
	const totalSec = Math.floor(ms / 1000);
	const min = Math.floor(totalSec / 60);
	const sec = totalSec % 60;
	return `${min}:${sec.toString().padStart(2, "0")}`;
}

function getParticipantName(
	participants: Participant[] | undefined,
	participantId: number,
): string {
	if (!participants) return `Player ${participantId}`;
	const p = participants.find((_, i) => i + 1 === participantId);
	return p?.riotIdGameName ?? `Player ${participantId}`;
}

function getParticipantChamp(
	participants: Participant[] | undefined,
	participantId: number,
): string | null {
	if (!participants) return null;
	const p = participants.find((_, i) => i + 1 === participantId);
	return p?.championName ?? null;
}

export default function ObjectivesTimeline({
	timeline,
	participants,
	version,
}: ObjectivesTimelineProps) {
	const [filter, setFilter] = useState<FilterType>("all");
	const [expanded, setExpanded] = useState(false);
	const [showAll, setShowAll] = useState(false);

	const { events, towerSummary, gameDuration } = useMemo(() => {
		if (!timeline)
			return {
				events: [],
				towerSummary: { blue: 0, red: 0, blueInhib: 0, redInhib: 0 },
				gameDuration: 0,
			};

		const evts: GameEvent[] = [];
		let blueTowers = 0;
		let redTowers = 0;
		let blueInhib = 0;
		let redInhib = 0;
		let lastTimestamp = 0;

		for (const frame of timeline.info.frames) {
			lastTimestamp = Math.max(lastTimestamp, frame.timestamp);
			for (const event of frame.events) {
				if (event.type === "ELITE_MONSTER_KILL") {
					const monsterType = event.monsterType ?? "UNKNOWN";
					evts.push({
						timestamp: event.timestamp,
						category: "objective",
						label: MONSTER_LABELS[monsterType] ?? monsterType,
						icon: getObjectiveIcon(monsterType),
						team: event.killerTeamId === 100 ? "blue" : "red",
					});
				}

				if (event.type === "BUILDING_KILL") {
					const buildingType =
						event.buildingType ?? "TOWER_BUILDING";
					const takerTeam =
						event.teamId === 100 ? "red" : "blue";

					if (buildingType === "INHIBITOR_BUILDING") {
						if (takerTeam === "blue") blueInhib++;
						else redInhib++;
					} else {
						if (takerTeam === "blue") blueTowers++;
						else redTowers++;
					}

					const lane = LANE_LABELS[event.laneType ?? ""] ?? "";
					const tower = TOWER_LABELS[event.towerType ?? ""] ?? "";
					const label =
						buildingType === "INHIBITOR_BUILDING"
							? `${lane} Inhibitor`
							: `${lane} ${tower}`;
					evts.push({
						timestamp: event.timestamp,
						category: "tower",
						label,
						icon: getBuildingIcon(buildingType),
						team: takerTeam,
					});
				}

				if (
					event.type === "CHAMPION_KILL" &&
					event.killerId &&
					event.victimId
				) {
					const killerTeam =
						event.killerId <= 5 ? "blue" : "red";
					evts.push({
						timestamp: event.timestamp,
						category: "kill",
						label: "",
						icon: "",
						team: killerTeam,
						killerId: event.killerId,
						victimId: event.victimId,
					});
				}
			}
		}

		return {
			events: evts.sort((a, b) => a.timestamp - b.timestamp),
			towerSummary: {
				blue: blueTowers,
				red: redTowers,
				blueInhib: blueInhib,
				redInhib: redInhib,
			},
			gameDuration: lastTimestamp,
		};
	}, [timeline]);

	if (!timeline || events.length === 0) return null;

	const timelineObjectives = events.filter(
		(e) => e.category === "objective",
	);

	const filteredEvents = events.filter((e) => {
		if (filter === "all") return true;
		if (filter === "objectives") return e.category === "objective";
		if (filter === "towers") return e.category === "tower";
		if (filter === "kills") return e.category === "kill";
		return true;
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
					Objectives & Events
				</CardTitle>
			</CardHeader>
			<CardContent>
				{/* Timeline bar (objectives only) */}
				{timelineObjectives.length > 0 && (
					<div className="relative h-20 mx-1 sm:mx-2">
						<div className="absolute top-[26px] left-0 right-0 h-1 rounded-full bg-muted" />

						<div className="absolute bottom-0 left-0 right-0 flex justify-between">
							{Array.from(
								{
									length:
										Math.ceil(
											gameDuration / 1000 / 60 / 5,
										) + 1,
								},
								(_, i) => i * 5,
							)
								.filter(
									(m) =>
										m <=
										Math.ceil(
											gameDuration / 1000 / 60,
										),
								)
								.map((min) => (
									<span
										key={min}
										className="text-sm text-muted-foreground"
									>
										{min}:00
									</span>
								))}
						</div>

						{timelineObjectives.map((obj, i) => {
							const percent =
								gameDuration > 0
									? (obj.timestamp / gameDuration) * 100
									: 0;
							const teamLabel =
								obj.team === "blue"
									? "Blue team"
									: "Red team";
							return (
								<div
									key={i}
									className="absolute top-[6px]"
									style={{
										left: `${Math.min(Math.max(percent, 2), 96)}%`,
										transform: "translateX(-50%)",
									}}
								>
									<IconTooltip
										label={`${teamLabel} took ${obj.label} at ${formatTime(obj.timestamp)}`}
									>
										<div
											className={`size-9 rounded-lg flex items-center justify-center border-2 border-background cursor-pointer hover:scale-110 transition-transform ${
												obj.team === "blue"
													? "bg-blue-600"
													: "bg-red-600"
											}`}
										>
											<Image
												src={obj.icon}
												alt={obj.label}
												width={22}
												height={22}
												className="brightness-200"
											/>
										</div>
									</IconTooltip>
								</div>
							);
						})}
					</div>
				)}

				{/* Tower/Inhib summary */}
				<div className="mt-5 flex flex-wrap gap-2 items-center justify-between rounded-lg bg-muted/30 px-3 sm:px-4 py-3">
					<div className="flex items-center gap-3">
						<span className="text-base font-bold text-blue-400">
							Blue
						</span>
						<span className="text-base text-muted-foreground">
							<Image
								src={getBuildingIcon("TOWER_BUILDING")}
								alt="Tower"
								width={14}
								height={14}
								className="inline mr-1 brightness-200"
							/>
							{towerSummary.blue} towers
							{towerSummary.blueInhib > 0 && (
								<>
									{" · "}
									<Image
										src={getBuildingIcon(
											"INHIBITOR_BUILDING",
										)}
										alt="Inhibitor"
										width={14}
										height={14}
										className="inline mr-1 brightness-200"
									/>
									{towerSummary.blueInhib} inhibs
								</>
							)}
						</span>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-base text-muted-foreground">
							<Image
								src={getBuildingIcon("TOWER_BUILDING")}
								alt="Tower"
								width={14}
								height={14}
								className="inline mr-1 brightness-200"
							/>
							{towerSummary.red} towers
							{towerSummary.redInhib > 0 && (
								<>
									{" · "}
									<Image
										src={getBuildingIcon(
											"INHIBITOR_BUILDING",
										)}
										alt="Inhibitor"
										width={14}
										height={14}
										className="inline mr-1 brightness-200"
									/>
									{towerSummary.redInhib} inhibs
								</>
							)}
						</span>
						<span className="text-base font-bold text-red-400">
							Red
						</span>
					</div>
				</div>

				{/* Filter */}
				<div className="mt-4 flex gap-1.5">
					{FILTERS.map((f) => (
						<button
							key={f.value}
							onClick={() => setFilter(f.value)}
							className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
								filter === f.value
									? "bg-primary text-primary-foreground"
									: "bg-secondary text-secondary-foreground hover:bg-accent/30"
							}`}
						>
							{f.label}
						</button>
					))}
				</div>

				{/* Event log — first 15 always visible */}
				<div className="mt-3 space-y-1">
					{filteredEvents.slice(0, 15).map((evt, i) => (
									<div
										key={i}
										className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
											evt.team === "blue"
												? "bg-blue-500/5"
												: "bg-red-500/5"
							}`}
						>
							<span className="text-sm text-muted-foreground w-12 shrink-0 font-mono">
								{formatTime(evt.timestamp)}
							</span>

							{evt.category === "kill" ? (
								<>
									{version &&
										getParticipantChamp(
											participants,
											evt.killerId!,
										) && (
											<Image
												src={getChampionIcon(
													version,
													getParticipantChamp(
														participants,
														evt.killerId!,
													)!,
												)}
												alt=""
												width={24}
												height={24}
												className="rounded shrink-0"
											/>
										)}
									<span
										className={`font-medium ${
											evt.team === "blue"
												? "text-blue-400"
												: "text-red-400"
										}`}
									>
										{getParticipantName(
											participants,
											evt.killerId!,
										)}
									</span>
									<span className="text-muted-foreground">
										killed
									</span>
									{version &&
										getParticipantChamp(
											participants,
											evt.victimId!,
										) && (
											<Image
												src={getChampionIcon(
													version,
													getParticipantChamp(
														participants,
														evt.victimId!,
													)!,
												)}
												alt=""
												width={24}
												height={24}
												className="rounded shrink-0"
											/>
										)}
									<span
										className={`font-medium ${
											evt.team === "blue"
												? "text-red-400"
												: "text-blue-400"
										}`}
									>
										{getParticipantName(
											participants,
											evt.victimId!,
										)}
									</span>
								</>
							) : (
								<>
									<Image
										src={evt.icon}
										alt={evt.label}
										width={18}
										height={18}
										className="brightness-200 shrink-0"
									/>
									<span
										className={`font-medium ${
											evt.team === "blue"
												? "text-blue-400"
												: "text-red-400"
										}`}
									>
										{evt.team === "blue" ? "Blue" : "Red"}
									</span>
									<span className="text-muted-foreground">
										took {evt.label}
									</span>
								</>
							)}
						</div>
					))}

					{/* Expand for remaining events */}
					{filteredEvents.length > 15 && (
						<>
							<AnimatePresence>
								{expanded && (
									<motion.div
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: "auto", opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										transition={{ duration: 0.3, ease: "easeInOut" }}
										className="overflow-hidden space-y-1"
									>
										{filteredEvents.slice(15).map((evt, i) => (
											<div
												key={i + 15}
												className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
													evt.team === "blue"
														? "bg-blue-500/5"
														: "bg-red-500/5"
												}`}
											>
												<span className="text-sm text-muted-foreground w-12 shrink-0 font-mono">
													{formatTime(evt.timestamp)}
												</span>
												{evt.category === "kill" ? (
													<>
														{version && getParticipantChamp(participants, evt.killerId!) && (
															<Image src={getChampionIcon(version, getParticipantChamp(participants, evt.killerId!)!)} alt="" width={24} height={24} className="rounded shrink-0" />
														)}
														<span className={`font-medium ${evt.team === "blue" ? "text-blue-400" : "text-red-400"}`}>
															{getParticipantName(participants, evt.killerId!)}
														</span>
														<span className="text-muted-foreground">killed</span>
														{version && getParticipantChamp(participants, evt.victimId!) && (
															<Image src={getChampionIcon(version, getParticipantChamp(participants, evt.victimId!)!)} alt="" width={24} height={24} className="rounded shrink-0" />
														)}
														<span className={`font-medium ${evt.team === "blue" ? "text-red-400" : "text-blue-400"}`}>
															{getParticipantName(participants, evt.victimId!)}
														</span>
													</>
												) : (
													<>
														<Image src={evt.icon} alt={evt.label} width={18} height={18} className="brightness-200 shrink-0" />
														<span className={`font-medium ${evt.team === "blue" ? "text-blue-400" : "text-red-400"}`}>
															{evt.team === "blue" ? "Blue" : "Red"}
														</span>
														<span className="text-muted-foreground">took {evt.label}</span>
													</>
												)}
											</div>
										))}
									</motion.div>
								)}
							</AnimatePresence>

							<button
								onClick={() => setExpanded(!expanded)}
								className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors cursor-pointer"
							>
								<span>{expanded ? "Collapse" : `Show all (${filteredEvents.length - 15} more)`}</span>
								<motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
									<ChevronDown className="size-4" />
								</motion.div>
							</button>
						</>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
