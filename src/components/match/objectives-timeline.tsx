"use client";

import { type Timeline } from "@/lib/validators/timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";

interface ObjectivesTimelineProps {
	timeline?: Timeline;
}

interface ObjectiveEvent {
	timestamp: number;
	type: string;
	label: string;
	icon: string;
	team: "blue" | "red";
}

const MONSTER_LABELS: Record<string, string> = {
	DRAGON: "Dragon",
	RIFTHERALD: "Rift Herald",
	BARON_NASHOR: "Baron Nashor",
	HORDE: "Void Grubs",
	ELDER_DRAGON: "Elder Dragon",
};

const MONSTER_ICONS: Record<string, string> = {
	DRAGON: "🐉",
	RIFTHERALD: "🦀",
	BARON_NASHOR: "👾",
	HORDE: "🐛",
	ELDER_DRAGON: "🐲",
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

const BUILDING_ICONS: Record<string, string> = {
	TOWER_BUILDING: "🗼",
	INHIBITOR_BUILDING: "🏛️",
};

function formatTime(ms: number): string {
	const totalSec = Math.floor(ms / 1000);
	const min = Math.floor(totalSec / 60);
	const sec = totalSec % 60;
	return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default function ObjectivesTimeline({
	timeline,
}: ObjectivesTimelineProps) {
	const events = useMemo(() => {
		if (!timeline) return [];

		const result: ObjectiveEvent[] = [];

		for (const frame of timeline.info.frames) {
			for (const event of frame.events) {
				if (event.type === "ELITE_MONSTER_KILL") {
					const monsterType = event.monsterType ?? "UNKNOWN";
					result.push({
						timestamp: event.timestamp,
						type: monsterType,
						label: MONSTER_LABELS[monsterType] ?? monsterType,
						icon: MONSTER_ICONS[monsterType] ?? "⚔️",
						team: (event.killerTeamId === 100 ? "blue" : "red"),
					});
				}

				if (event.type === "BUILDING_KILL") {
					const buildingType = event.buildingType ?? "TOWER_BUILDING";
					const lane = LANE_LABELS[event.laneType ?? ""] ?? "";
					const tower = TOWER_LABELS[event.towerType ?? ""] ?? "";
					const label = buildingType === "INHIBITOR_BUILDING"
						? `${lane} Inhibitor`
						: `${lane} ${tower}`;
					result.push({
						timestamp: event.timestamp,
						type: buildingType,
						label,
						icon: BUILDING_ICONS[buildingType] ?? "🏗️",
						team: (event.teamId === 100 ? "red" : "blue"),
					});
				}
			}
		}

		return result.sort((a, b) => a.timestamp - b.timestamp);
	}, [timeline]);

	if (!timeline || events.length === 0) return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
					Objectives
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="relative space-y-0">
					{/* Center line */}
					<div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />

					{events.map((event, i) => (
						<div
							key={i}
							className={`flex items-center gap-3 py-1.5 ${
								event.team === "blue"
									? "flex-row pr-[52%]"
									: "flex-row-reverse pl-[52%]"
							}`}
						>
							<div
								className={`flex-1 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
									event.team === "blue"
										? "justify-end bg-blue-500/10 text-blue-400"
										: "justify-start bg-red-500/10 text-red-400"
								}`}
							>
								<span>{event.icon}</span>
								<span className="font-medium">
									{event.label}
								</span>
								<span className="text-xs text-muted-foreground">
									{formatTime(event.timestamp)}
								</span>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
