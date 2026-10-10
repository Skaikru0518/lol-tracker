import { ChampionIcon } from "@/components/ui/champion-icon";
import { formatPoints } from "@/lib/format";
import { type MasteryOnlyRow } from "@/lib/summoner/champion-rows";

/** Champions with mastery but no stored games, as compact tiles. */
export function MasteryOnlyList({ rows, version }: { rows: MasteryOnlyRow[]; version: string }) {
	return (
		<div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-4">
			{rows.map((row) => (
				<div key={row.championId} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
					<ChampionIcon version={version} championName={row.championKey} size={24} />
					<span className="min-w-0 flex-1 truncate text-foreground">{row.championName}</span>
					<span className="text-xs text-muted-foreground">
						M{row.mastery.championLevel} · {formatPoints(row.mastery.championPoints)}
					</span>
				</div>
			))}
		</div>
	);
}
