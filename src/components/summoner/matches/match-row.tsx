"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScoreCircle, ScorePlaceholder } from "@/components/match/performance/score-circle";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { type ScoreSummary } from "@/lib/performance/score";
import { ItemSlots } from "@/components/ui/item-slots";
import { SpellRuneStack } from "@/components/ui/spell-rune-stack";
import { getPlacementColor, getPlacementSuffix, isArenaMatch } from "@/lib/game/arena-helpers";
import { csPerMinute, formatDuration, kdaRatio, timeAgo } from "@/lib/shared/format";
import { killParticipation, participantItems, rowResult, runeIcons, shortQueueName, type RuneMaps } from "@/lib/summoner/matches/match-row";
import { type Match, type Participant } from "@/lib/validators/match";
import { MatchBadges } from "./match-badges";
import { MatchRowExpanded } from "./match-row-expanded";
import { SHOW_SKILL_ESTIMATES } from "@/lib/shared/features";
import { PerformanceRankSlot } from "./performance-rank-slot";
import { ScoreBreakdown } from "./score-breakdown";
import { rankedQueueForQueueId } from "@/lib/game/ranked-queues";

function Stat({ value, label, className }: { value: React.ReactNode; label: string; className?: string }) {
	return (
		<div className="w-11 text-center leading-tight">
			<p className={cn("text-sm font-semibold text-foreground", className)}>{value}</p>
			<p className="text-3xs text-muted-foreground">{label}</p>
		</div>
	);
}

/** Minimal match row (C): result, champion, KDA, CS/KP/LP, items and badges; expands to the scoreboard. */
export function MatchRow({
	match,
	player,
	version,
	runeData,
	lpChange,
	badgeIds,
	matchBadges,
	performance,
	performanceLoading,
	performanceRank,
}: {
	match: Match;
	player: Participant;
	version: string;
	runeData?: RuneMaps;
	lpChange: number | null;
	badgeIds: string[];
	matchBadges?: { puuid: string; badgeId: string }[];
	performance: ScoreSummary | null;
	performanceLoading: boolean;
	performanceRank: { tier: string; rank: string } | null;
}) {
	const [open, setOpen] = useState(false);
	const { info } = match;
	const arena = isArenaMatch(info.queueId);
	const placement = player.placement ?? (player.win ? 1 : 5);
	const result = rowResult(info.queueId, info.gameDuration, player);
	const kda = kdaRatio(player.kills, player.deaths, player.assists);
	const cs = player.totalMinionsKilled + player.neutralMinionsKilled;
	const ranked = rankedQueueForQueueId(info.queueId) !== null;
	const kp = killParticipation(player, info.participants);
	const queueName = shortQueueName(info.queueId, info.gameMode);
	const when = `${formatDuration(info.gameDuration)} · ${timeAgo(info.gameCreation)}`;
	const lpLabel = lpChange === null ? "—" : `${lpChange >= 0 ? "+" : ""}${lpChange}`;
	const kdaLabel = kda === null ? "Perfect" : `${kda} KDA`;

	const resultLabel = arena ? (
		<span style={{ color: getPlacementColor(placement) }}>
			{placement}
			<span className="align-super text-3xs">{getPlacementSuffix(placement)}</span>
		</span>
	) : (
		<span className={result === "win" ? "text-win" : result === "loss" ? "text-loss" : "text-muted-foreground"}>
			{result === "win" ? "Victory" : result === "loss" ? "Defeat" : "Remake"}
		</span>
	);
	const score = performance ? (
		<ScoreCircle score={performance.score} grade={performance.grade} tooltip={<ScoreBreakdown matchId={match.metadata.matchId} puuid={player.puuid} />} />
	) : performanceLoading ? (
		<Skeleton className="size-9 shrink-0 rounded-full" />
	) : (
		<ScorePlaceholder />
	);
	const champion = <ChampionIcon version={version} championName={player.championName} size={44} level={player.champLevel} />;
	const kdaLine = (
		<span className="whitespace-nowrap text-base font-bold text-foreground">
			{player.kills} / <span className="text-loss">{player.deaths}</span> / {player.assists}
		</span>
	);
	const items = <ItemSlots version={version} items={participantItems(player)} size={22} />;
	const badges = badgeIds.length > 0 && <MatchBadges badgeIds={badgeIds} max={2} />;
	const chevron = <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />;

	return (
		<div className="border-b last:border-b-0">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				className={cn(
					"block w-full bg-gradient-to-r to-transparent to-60% px-3 py-2.5 text-left transition-colors hover:bg-accent/40 sm:px-4",
					result === "win" ? "from-win/20" : result === "loss" ? "from-loss/20" : "from-muted/40",
				)}
			>
				<div className="grid gap-2 sm:hidden">
					<div className="flex items-center gap-2.5">
						{champion}
						<div className="min-w-0 flex-1 leading-tight">
							<p className="truncate text-sm font-bold">
								{resultLabel} <span className="text-2xs font-normal text-muted-foreground">· {queueName}</span>
							</p>
							<p className="text-3xs text-muted-foreground">{when}</p>
						</div>
						{ranked && lpChange !== null && (
							<span className={cn("shrink-0 rounded px-1.5 py-0.5 text-2xs font-semibold", lpChange >= 0 ? "bg-win/15 text-win" : "bg-loss/15 text-loss")}>
								{lpLabel} LP
							</span>
						)}
						{score}
					</div>
					<div className="flex items-baseline justify-between gap-2">
						<p>
							{kdaLine} <span className="text-2xs text-muted-foreground">{kdaLabel}</span>
						</p>
						<p className="truncate text-2xs text-muted-foreground">
							{!arena && `${cs} CS (${csPerMinute(cs, info.gameDuration)}) · `}
							{kp}% KP
						</p>
					</div>
					<div className="flex items-center justify-between gap-2">
						{items}
						{chevron}
					</div>
					{badges}
				</div>

				<div className="hidden items-center gap-3 sm:flex">
					<div className="w-[4.75rem] shrink-0 leading-tight">
						<p className="text-sm font-bold">{resultLabel}</p>
						<p className="truncate text-2xs text-foreground">{queueName}</p>
						<p className="text-3xs text-muted-foreground">{when}</p>
					</div>

					{score}
					{champion}
					<SpellRuneStack version={version} spells={[player.summoner1Id, player.summoner2Id]} runes={runeIcons(player, runeData)} />

					<div className="w-24 leading-tight">
						<p>{kdaLine}</p>
						<p className="text-2xs text-muted-foreground">{kdaLabel}</p>
					</div>

					<div className="hidden gap-1 md:flex">
						{!arena && <Stat value={cs} label={`CS ${csPerMinute(cs, info.gameDuration)}`} />}
						<Stat value={`${kp}%`} label="KP" />
						{ranked && (
							<Stat
								value={lpLabel}
								label="LP"
								className={lpChange === null ? "text-muted-foreground" : lpChange >= 0 ? "text-win" : "text-loss"}
							/>
						)}
						{ranked && SHOW_SKILL_ESTIMATES && <PerformanceRankSlot rank={performanceRank} />}
					</div>

					<div className="ml-auto flex flex-col items-end gap-1">
						{items}
						{badges}
					</div>

					{chevron}
				</div>
			</button>

			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.18 }}
						className="overflow-hidden"
					>
						<MatchRowExpanded match={match} puuid={player.puuid} version={version} badges={matchBadges} />
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
