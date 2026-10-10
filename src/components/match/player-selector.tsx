"use client";

import { cn } from "@/lib/utils";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { getChampionDisplayName } from "@/lib/game/icon-helpers";
import { type Match } from "@/lib/validators/match";

/** 5 vs 5 champion buttons; the selected player gets the gold ring. */
export function PlayerSelector({
	match,
	version,
	selected,
	onSelect,
}: {
	match: Match;
	version: string;
	selected: string;
	onSelect: (puuid: string) => void;
}) {
	const teams = [100, 200].map((teamId) => match.info.participants.filter((p) => p.teamId === teamId));

	return (
		<div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Select player">
			{teams.map((team, index) => (
				<div key={index} className={cn("flex gap-1.5", index === 1 && "sm:ml-4")}>
					{team.map((p) => (
						<button
							key={p.puuid}
							type="button"
							onClick={() => onSelect(p.puuid)}
							aria-pressed={p.puuid === selected}
							title={`${p.riotIdGameName} · ${getChampionDisplayName(p.championName)}`}
							className={cn(
								"rounded-md border-2 transition-colors",
								p.puuid === selected ? "border-gold" : "border-transparent opacity-70 hover:opacity-100",
							)}
						>
							<ChampionIcon version={version} championName={p.championName} size={36} />
						</button>
					))}
				</div>
			))}
		</div>
	);
}
