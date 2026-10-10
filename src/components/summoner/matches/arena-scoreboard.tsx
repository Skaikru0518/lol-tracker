import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { ItemSlots } from "@/components/ui/item-slots";
import { badgeIdsFor } from "@/lib/match/detail";
import { participantItems } from "@/lib/summoner/match-row";
import { MatchBadges } from "./match-badges";
import { getArenaTeams, getPlacementColor, getPlacementSuffix } from "@/lib/arena-helpers";
import { formatThousands } from "@/lib/format";
import { toSummonerSlug } from "@/lib/riot-id";
import { type Participant } from "@/lib/validators/match";

/** Arena leaderboard: eight duo teams by placement, top four above the divider; the match page adds items and badges. */
export function ArenaScoreboard({
	participants,
	version,
	highlightPuuid,
	badges,
	showItems = false,
}: {
	participants: Participant[];
	version: string;
	highlightPuuid: string;
	badges?: { puuid: string; badgeId: string }[];
	showItems?: boolean;
}) {
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
								{badges && <MatchBadges badgeIds={badgeIdsFor(badges, p.puuid)} max={2} />}
								{showItems && <ItemSlots version={version} items={participantItems(p)} size={18} className="ml-auto hidden md:flex" />}
								<span className={cn("ml-auto text-muted-foreground", showItems && "md:ml-0")}>
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
