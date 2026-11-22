import Link from "next/link";
import { Crown } from "lucide-react";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { timeAgo } from "@/lib/shared/format";
import { cn } from "@/lib/utils";
import { type DuoComparePayload } from "@/lib/validators/duo";

type Shared = DuoComparePayload["shared"][number];

function Side({ side, crowned, version, align }: { side: Shared["player"]; crowned: boolean; version: string; align: "left" | "right" }) {
	return (
		<div className={cn("flex min-w-0 flex-1 items-center gap-2", align === "right" && "flex-row-reverse text-right")}>
			<ChampionIcon version={version} championName={side.championName} size={28} />
			<span className={cn("w-7 text-sm font-semibold tabular-nums", crowned ? "text-gold" : "text-foreground")}>{side.score ?? "—"}</span>
			{crowned && <Crown className="size-3.5 shrink-0 text-gold" aria-label="Higher score" />}
			<span className="hidden text-xs text-muted-foreground sm:inline">
				{side.kills}/{side.deaths}/{side.assists}
			</span>
		</div>
	);
}

/** Shared games, newest first; the higher score wears the crown. */
export function SharedGamesList({ shared, puuid, version }: { shared: Shared[]; puuid: string; version: string }) {
	return (
		<ul className="divide-y divide-border/50">
			{shared.map((g) => (
				<li key={g.matchId}>
					<Link href={`/match/${g.matchId}?puuid=${puuid}`} className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-accent/40 sm:gap-3 sm:px-4">
						<span className={cn("w-9 shrink-0 text-2xs font-bold", g.win ? "text-win" : "text-loss")}>{g.win ? "WIN" : "LOSS"}</span>
						<Side side={g.player} crowned={g.crown === "player"} version={version} align="left" />
						<Side side={g.friend} crowned={g.crown === "friend"} version={version} align="right" />
						<span className="hidden w-16 shrink-0 text-right text-3xs text-muted-foreground sm:inline">{timeAgo(g.gameCreation)}</span>
					</Link>
				</li>
			))}
		</ul>
	);
}
