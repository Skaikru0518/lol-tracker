import { type ChampionStat } from "@/lib/validators/champion-stats";

function Item({ label, value, className }: { label: string; value: string; className?: string }) {
	return (
		<div>
			<p className={`text-lg font-bold text-foreground ${className ?? ""}`}>{value}</p>
			<p className="text-xs text-muted-foreground">{label}</p>
		</div>
	);
}

/** Games, winrate, KDA, CS/min and kill participation on one champion. */
export function ChampionSummary({ stat, killParticipation }: { stat: ChampionStat | undefined; killParticipation: number | null }) {
	return (
		<div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-5">
			<Item label="games" value={stat ? String(stat.games) : "—"} />
			<Item label="winrate" value={stat ? `${Math.round(stat.winRate)}%` : "—"} className={stat && stat.winRate >= 50 ? "text-win" : stat ? "text-loss" : ""} />
			<Item label="KDA" value={stat ? String(stat.kda) : "—"} />
			<Item label="CS/min" value={stat ? String(stat.csPerMin) : "—"} />
			<Item label="KP" value={killParticipation === null ? "—" : `${killParticipation}%`} />
		</div>
	);
}
