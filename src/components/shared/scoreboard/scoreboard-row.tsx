import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { ItemSlots } from "@/components/ui/item-slots";
import { RankEmblem } from "@/components/ui/rank-emblem";
import { Skeleton } from "@/components/ui/skeleton";
import { formatThousands } from "@/lib/format";
import { formatRankLabel } from "@/lib/rank-calculator";
import { toSummonerSlug } from "@/lib/riot-id";
import { participantItems } from "@/lib/summoner/match-row";
import { type Participant } from "@/lib/validators/match";
import { type RankedEntry } from "@/lib/validators/ranked";

/** One player on one side of the scoreboard; the red side is mirrored. */
export function ScoreboardRow({
	participant,
	side,
	version,
	highlighted,
	rank,
	ranksLoading = false,
}: {
	participant: Participant | null;
	side: "blue" | "red";
	version: string;
	highlighted: boolean;
	rank?: RankedEntry;
	ranksLoading?: boolean;
}) {
	if (!participant) return <div className="h-11" />;
	const p = participant;

	return (
		<div className={cn("flex h-11 items-center gap-2 px-2", side === "red" && "flex-row-reverse", highlighted && "bg-gold/10")}>
			{ranksLoading ? (
				<Skeleton className="size-5 shrink-0 rounded-full" />
			) : (
				<span title={rank ? `${formatRankLabel(rank.tier, rank.rank)} · ${rank.leaguePoints} LP` : "Unranked"} className="shrink-0">
					<RankEmblem tier={rank?.tier} size={20} />
				</span>
			)}
			<ChampionIcon version={version} championName={p.championName} size={28} level={p.champLevel} />
			<div className={cn("w-24 min-w-0 leading-tight sm:w-28", side === "red" && "text-right")}>
				<Link
					href={`/summoner/${toSummonerSlug(p.riotIdGameName, p.riotIdTagline)}`}
					onClick={(e) => e.stopPropagation()}
					className={cn("block truncate text-xs font-semibold hover:text-primary", highlighted ? "text-gold" : "text-foreground")}
				>
					{p.riotIdGameName}
				</Link>
				<div className="block truncate text-3xs text-muted-foreground">
					{ranksLoading ? <Skeleton className="mt-0.5 h-2.5 w-14" /> : rank ? formatRankLabel(rank.tier, rank.rank) : "Unranked"}
				</div>
			</div>
			<div className="w-16 text-center leading-tight">
				<p className="text-xs font-semibold text-foreground">
					{p.kills}/{p.deaths}/{p.assists}
				</p>
				<p className="text-3xs text-muted-foreground">
					{p.totalMinionsKilled + p.neutralMinionsKilled} CS · {formatThousands(p.goldEarned)}
				</p>
			</div>
			<ItemSlots version={version} items={participantItems(p)} size={17} className="hidden sm:flex" />
		</div>
	);
}
