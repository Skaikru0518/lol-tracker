import { cn } from "@/lib/utils";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { formatDiff } from "@/lib/performance/format";
import { type OpponentDiff as Diff } from "@/lib/performance/score";

function DiffStat({ label, value }: { label: string; value: number | null }) {
	return (
		<div className="text-center">
			<p className={cn("text-sm font-semibold", value === null ? "text-muted-foreground" : value > 0 ? "text-win" : value < 0 ? "text-loss" : "text-foreground")}>
				{value === null ? "—" : formatDiff(value)}
			</p>
			<p className="text-3xs text-muted-foreground">{label}</p>
		</div>
	);
}

export function OpponentDiff({ opponent, version }: { opponent: Diff; version: string }) {
	return (
		<div className="flex flex-wrap items-center gap-4">
			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				vs <ChampionIcon version={version} championName={opponent.championName} size={28} />
			</div>
			<DiffStat label="Gold" value={opponent.goldDiff} />
			<DiffStat label="XP" value={opponent.xpDiff} />
			<DiffStat label="CS" value={opponent.csDiff} />
			<DiffStat label="Damage" value={opponent.damageDiff} />
		</div>
	);
}
