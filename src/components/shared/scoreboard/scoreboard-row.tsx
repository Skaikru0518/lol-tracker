import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { ItemSlots } from "@/components/ui/item-slots";
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
}: {
	participant: Participant | null;
	side: "blue" | "red";
	version: string;
	highlighted: boolean;
	rank?: RankedEntry;
}) {
	if (!participant) return <div className="h-11" />;
	const p = participant;

	return (
		<div className={cn("flex h-11 items-center gap-2 px-2", side === "red" && "flex-row-reverse", highlighted && "bg-gold/10")}>
			<ChampionIcon version={version} championName={p.championName} size={28} level={p.champLevel} />
			<div className={cn("w-24 min-w-0 leading-tight sm:w-28", side === "red" && "text-right")}>
				<Link
					href={`/summoner/${toSummonerSlug(p.riotIdGameName, p.riotIdTagline)}`}
					onClick={(e) => e.stopPropagation()}
					className={cn("block truncate text-xs font-semibold hover:text-primary", highlighted ? "text-gold" : "text-foreground")}
				>
					{p.riotIdGameName}
				</Link>
				<span className="block truncate text-[10px] text-muted-foreground">
					{rank ? formatRankLabel(rank.tier, rank.rank) : "Unranked"}
				</span>
			</div>
			<div className="w-16 text-center leading-tight">
				<p className="text-xs font-semibold text-foreground">
					{p.kills}/{p.deaths}/{p.assists}
				</p>
				<p className="text-[10px] text-muted-foreground">
					{p.totalMinionsKilled + p.neutralMinionsKilled} CS · {formatThousands(p.goldEarned)}
				</p>
			</div>
			<ItemSlots version={version} items={participantItems(p)} size={17} className="hidden sm:flex" />
		</div>
	);
}
