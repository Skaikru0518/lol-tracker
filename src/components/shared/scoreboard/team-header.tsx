import { cn } from "@/lib/utils";
import { getBuildingIcon, getObjectiveIcon } from "@/lib/icon-helpers";
import { type TeamObjectives, type TeamSummary } from "@/lib/summoner/scoreboard";

const OBJECTIVES: { key: keyof TeamObjectives; label: string; icon: string }[] = [
	{ key: "towers", label: "Towers", icon: getBuildingIcon("TOWER_BUILDING") },
	{ key: "dragons", label: "Dragons", icon: getObjectiveIcon("DRAGON") },
	{ key: "barons", label: "Barons", icon: getObjectiveIcon("BARON_NASHOR") },
	{ key: "heralds", label: "Rift Heralds", icon: getObjectiveIcon("RIFTHERALD") },
	{ key: "grubs", label: "Void Grubs", icon: getObjectiveIcon("HORDE") },
];

/** Team label, result (or Remake), K/D/A and objective icons with counts for one side of the scoreboard. */
export function TeamHeader({ team, side, remake }: { team: TeamSummary; side: "blue" | "red"; remake: boolean }) {
	return (
		<div className={cn("flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs", side === "red" && "flex-row-reverse text-right")}>
			<span className={cn("font-bold", side === "blue" ? "text-team-blue" : "text-team-red")}>{side.toUpperCase()}</span>
			<span className={cn("font-semibold", remake ? "text-muted-foreground" : team.win ? "text-win" : "text-loss")}>
				{remake ? "Remake" : team.win ? "Victory" : "Defeat"}
			</span>
			<span className="text-foreground">
				{team.kills}/{team.deaths}/{team.assists}
			</span>
			<span className="flex items-center gap-2 text-muted-foreground">
				{OBJECTIVES.map((o) => (
					<span key={o.key} title={o.label} className="flex items-center gap-0.5">
						<img src={o.icon} alt={o.label} width={14} height={14} className="size-3.5 opacity-80" />
						{team.objectives[o.key]}
					</span>
				))}
			</span>
		</div>
	);
}
