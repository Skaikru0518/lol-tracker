import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { RankEmblem } from "@/components/ui/rank-emblem";
import { Skeleton } from "@/components/ui/skeleton";
import { type Champion, getRuneIcon, getSummonerSpellIcon, getSummonerSpellName, RANK_COLORS } from "@/lib/icon-helpers";
import { type RankSummary } from "@/lib/live/live-game";
import { formatRankLabel } from "@/lib/rank-calculator";
import { riotIdToSlug } from "@/lib/riot-id";
import { type RuneMaps } from "@/lib/summoner/match-row";
import { remSize } from "@/lib/ui/size";
import { type LiveGameParticipant } from "@/lib/validators/live-game";

const ICON = remSize(18);

/** One live player: champion, spells, rune trees, name, rank emblem with tier, WR and games; the red side is mirrored. */
export function LiveRow({
	participant,
	side,
	version,
	champions,
	runeData,
	rank,
	ranksLoading,
	ranksFailed = false,
	highlighted,
}: {
	participant: LiveGameParticipant | null;
	side: "blue" | "red";
	version: string;
	champions?: Record<number, Champion>;
	runeData?: RuneMaps;
	rank: RankSummary | null;
	ranksLoading: boolean;
	ranksFailed?: boolean;
	highlighted: boolean;
}) {
	if (!participant) return <div className="h-14" />;
	const p = participant;
	const champion = champions?.[p.championId];
	const keystone = runeData?.runes.get(p.perks.perkIds[0]);
	const primary = runeData?.styles.get(p.perks.perkStyle);
	const secondary = runeData?.styles.get(p.perks.perkSubStyle);
	const icon = (src: string | null | undefined, alt: string) =>
		src ? (
			<img src={src} alt={alt} title={alt} style={{ width: ICON, height: ICON }} className="rounded" />
		) : (
			<span title={alt} className="rounded bg-muted" style={{ width: ICON, height: ICON }} />
		);

	return (
		<div className={cn("flex h-14 items-center gap-2.5 px-3", side === "red" && "flex-row-reverse", highlighted && "bg-gold/10")}>
			{champion ? <ChampionIcon version={version} championName={champion.id} size={36} /> : <span className="size-9 rounded-md bg-muted" />}
			<div className="grid shrink-0 grid-cols-2 gap-0.5">
				{icon(getSummonerSpellIcon(version, p.spell1Id), getSummonerSpellName(p.spell1Id) ?? "Summoner spell")}
				{icon(keystone && getRuneIcon(keystone.icon), keystone?.name ?? "Keystone")}
				{icon(getSummonerSpellIcon(version, p.spell2Id), getSummonerSpellName(p.spell2Id) ?? "Summoner spell")}
				{icon(secondary && getRuneIcon(secondary.icon), secondary?.name ?? "Secondary tree")}
			</div>
			<div className={cn("min-w-0 flex-1 leading-tight", side === "red" && "text-right")}>
				<Link href={`/summoner/${riotIdToSlug(p.riotId)}`} className={cn("block truncate text-sm font-semibold hover:text-primary", highlighted ? "text-gold" : "text-foreground")}>
					{p.riotId}
				</Link>
				<p className="truncate text-2xs text-muted-foreground">
					{primary?.name ?? "—"} · {secondary?.name ?? "—"}
				</p>
			</div>
			{ranksLoading ? (
				<Skeleton className="h-8 w-24" />
			) : (
				<div className={cn("flex w-28 shrink-0 items-center gap-2", side === "red" && "flex-row-reverse")}>
					<RankEmblem tier={rank?.tier} size={28} />
					<div className={cn("leading-tight", side === "red" && "text-right")}>
						<p className="text-xs font-semibold" style={{ color: rank ? RANK_COLORS[rank.tier] : undefined }}>
							{rank ? formatRankLabel(rank.tier, rank.rank) : ranksFailed ? "Rank unavailable" : "Unranked"}
						</p>
						{rank && (
							<p className="text-3xs text-muted-foreground">
								<span className={rank.winRate >= 50 ? "text-win" : "text-loss"}>{rank.winRate}%</span> · {rank.games}G
							</p>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
