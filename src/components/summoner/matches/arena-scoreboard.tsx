import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { getArenaTeams, getPlacementColor, getPlacementSuffix } from "@/lib/arena-helpers";
import { formatThousands } from "@/lib/format";
import { toSummonerSlug } from "@/lib/riot-id";
import { type Participant } from "@/lib/validators/match";

/** Arena leaderboard: eight duo teams by placement, top four above the divider. */
export function ArenaScoreboard({ participants, version, highlightPuuid }: { participants: Participant[]; version: string; highlightPuuid: string }) {
	return (
		<div className="divide-y divide-border/50 bg-background/40">
			{getArenaTeams(participants).map((team) => (
				<div
					key={team.placement}
					className={cn("flex items-center gap-3 px-3 py-2", team.placement > 4 && "opacity-60", team.placement === 4 && "border-b-2 border-b-border")}
				>
					<span className="w-8 text-sm font-bold" style={{ color: getPlacementColor(team.placement) }}>
						{team.placement}
						<span className="align-super text-[9px]">{getPlacementSuffix(team.placement)}</span>
					</span>
					<div className="grid flex-1 gap-1 sm:grid-cols-2">
						{team.players.map((p) => (
							<div key={p.puuid} className="flex min-w-0 items-center gap-2 text-xs">
								<ChampionIcon version={version} championName={p.championName} size={22} />
								<Link
									href={`/summoner/${toSummonerSlug(p.riotIdGameName, p.riotIdTagline)}`}
									onClick={(e) => e.stopPropagation()}
									className={cn("truncate font-medium hover:text-primary", p.puuid === highlightPuuid ? "text-gold" : "text-foreground")}
								>
									{p.riotIdGameName}
								</Link>
								<span className="ml-auto text-muted-foreground">
									{p.kills}/{p.deaths}/{p.assists} · {formatThousands(p.totalDamageDealtToChampions)}
								</span>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
