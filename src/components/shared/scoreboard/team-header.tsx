import { cn } from "@/lib/utils";
import { type TeamSummary } from "@/lib/summoner/scoreboard";

/** Team label, result, K/D/A and objective counts for one side of the scoreboard. */
export function TeamHeader({ team, side }: { team: TeamSummary; side: "blue" | "red" }) {
	const o = team.objectives;
	return (
		<div className={cn("flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs", side === "red" && "flex-row-reverse text-right")}>
			<span className={cn("font-bold", side === "blue" ? "text-team-blue" : "text-team-red")}>{side.toUpperCase()}</span>
			<span className={team.win ? "font-semibold text-win" : "font-semibold text-loss"}>{team.win ? "Victory" : "Defeat"}</span>
			<span className="text-foreground">
				{team.kills}/{team.deaths}/{team.assists}
			</span>
			<span className="text-muted-foreground" title="Towers · Dragons · Barons · Heralds · Voidgrubs">
				T {o.towers} · D {o.dragons} · B {o.barons} · H {o.heralds} · G {o.grubs}
			</span>
		</div>
	);
}
