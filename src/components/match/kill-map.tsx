"use client";

import { useMemo } from "react";
import { type Timeline } from "@/lib/validators/timeline";
import IconTooltip from "@/components/ui/icon-tooltip";

interface KillMapProps {
	timeline?: Timeline;
	participantId: number;
	version?: string;
}

const MAP_MIN = 0;
const MAP_MAX = 15000;

function gameToPercent(coord: number): number {
	return ((coord - MAP_MIN) / (MAP_MAX - MAP_MIN)) * 100;
}

function formatTime(ms: number): string {
	const min = Math.floor(ms / 1000 / 60);
	const sec = Math.floor((ms / 1000) % 60);
	return `${min}:${sec.toString().padStart(2, "0")}`;
}

interface KillEvent {
	x: number;
	y: number;
	timestamp: number;
	isKiller: boolean;
}

export default function KillMap({
	timeline,
	participantId,
	version,
}: KillMapProps) {
	const kills = useMemo(() => {
		if (!timeline) return [];

		const result: KillEvent[] = [];

		for (const frame of timeline.info.frames) {
			for (const event of frame.events) {
				if (event.type === "CHAMPION_KILL") {
					if (
						event.killerId === participantId ||
						event.victimId === participantId
					) {
						const pos = event.position;
						if (!pos) continue;
						result.push({
							x: pos.x,
							y: pos.y,
							timestamp: event.timestamp,
							isKiller: event.killerId === participantId,
						});
					}
				}
			}
		}

		return result;
	}, [timeline, participantId]);

	if (!timeline || !version || kills.length === 0) return null;

	return (
		<div className="relative w-full aspect-square max-w-[280px] rounded-xl overflow-hidden border border-border/30">
			{/* Map background */}
			<img
				src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/map/map11.png`}
				alt="Summoner's Rift"
				className="w-full h-full object-cover opacity-60"
			/>

			{/* Kill dots */}
			{kills.map((kill, i) => {
				const left = gameToPercent(kill.x);
				const bottom = gameToPercent(kill.y);
				return (
					<IconTooltip
						key={i}
						label={`${kill.isKiller ? "Kill" : "Death"} at ${formatTime(kill.timestamp)}`}
					>
						<div
							className={`absolute cursor-pointer hover:scale-150 transition-transform ${
								kill.isKiller
									? "bg-cyan-400 shadow-cyan-400/50"
									: "bg-red-500 shadow-red-500/50"
							}`}
							style={{
								left: `${left}%`,
								bottom: `${bottom}%`,
								width: "10px",
								height: "10px",
								borderRadius: "50%",
								transform: "translate(-50%, 50%)",
								boxShadow: `0 0 6px currentColor`,
							}}
						/>
					</IconTooltip>
				);
			})}

		</div>
	);
}
