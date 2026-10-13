import { cn } from "@/lib/utils";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { type RecentSummaryPayload } from "@/lib/validators/performance";

export function TopChampions({ champions, version }: { champions: RecentSummaryPayload["champions"]; version: string }) {
	return (
		<ul className="space-y-1.5">
			{champions.map((c) => (
				<li key={c.championName} className="flex items-center gap-2 text-xs">
					<ChampionIcon version={version} championName={c.championName} size={28} />
					<span className={cn("w-9 font-semibold", c.winRate >= 50 ? "text-win" : "text-loss")}>{c.winRate}%</span>
					<span className="w-11 text-muted-foreground">
						{c.wins}W–{c.games - c.wins}L
					</span>
					<span className="text-muted-foreground">{c.kda} KDA</span>
				</li>
			))}
		</ul>
	);
}
