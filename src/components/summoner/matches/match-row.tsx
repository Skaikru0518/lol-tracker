"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { ItemSlots } from "@/components/ui/item-slots";
import { SpellRuneStack } from "@/components/ui/spell-rune-stack";
import { getPlacementColor, getPlacementSuffix, isArenaMatch, isArenaWin } from "@/lib/arena-helpers";
import { csPerMinute, formatDuration, kdaRatio, timeAgo } from "@/lib/format";
import { killParticipation, participantItems, runeIcons, shortQueueName, type RuneMaps } from "@/lib/summoner/match-row";
import { type Match, type Participant } from "@/lib/validators/match";
import { MatchBadges } from "./match-badges";
import { MatchRowExpanded } from "./match-row-expanded";

function Stat({ value, label, className }: { value: React.ReactNode; label: string; className?: string }) {
	return (
		<div className="w-11 text-center leading-tight">
			<p className={cn("text-sm font-semibold text-foreground", className)}>{value}</p>
			<p className="text-[10px] text-muted-foreground">{label}</p>
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
}: {
	match: Match;
	player: Participant;
	version: string;
	runeData?: RuneMaps;
	lpChange: number | null;
	badgeIds: string[];
}) {
	const [open, setOpen] = useState(false);
	const { info } = match;
	const arena = isArenaMatch(info.queueId);
	const placement = player.placement ?? (player.win ? 1 : 5);
	const won = arena ? isArenaWin(placement) : player.win;
	const kda = kdaRatio(player.kills, player.deaths, player.assists);
	const cs = player.totalMinionsKilled + player.neutralMinionsKilled;
	const ranked = info.queueId === 420 || info.queueId === 440;

	return (
		<div className="border-b last:border-b-0">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				className={cn(
					"flex w-full flex-wrap items-center gap-x-3 gap-y-2 bg-gradient-to-r to-transparent to-60% px-3 py-2.5 text-left transition-colors hover:bg-accent/40 sm:flex-nowrap sm:px-4",
					won ? "from-win/20" : "from-loss/20",
				)}
			>
				<div className="w-[4.75rem] shrink-0 leading-tight">
					{arena ? (
						<p className="text-sm font-bold" style={{ color: getPlacementColor(placement) }}>
							{placement}
							<span className="align-super text-[9px]">{getPlacementSuffix(placement)}</span>
						</p>
					) : (
						<p className={cn("text-sm font-bold", won ? "text-win" : "text-loss")}>{won ? "Victory" : "Defeat"}</p>
					)}
					<p className="truncate text-[11px] text-foreground">{shortQueueName(info.queueId, info.gameMode)}</p>
					<p className="text-[10px] text-muted-foreground">
						{formatDuration(info.gameDuration)} · {timeAgo(info.gameCreation)}
					</p>
				</div>

				<ChampionIcon version={version} championName={player.championName} size={44} level={player.champLevel} />
				<SpellRuneStack
					version={version}
					spells={[player.summoner1Id, player.summoner2Id]}
					runes={runeIcons(player, runeData)}
					className="hidden sm:grid"
				/>

				<div className="w-24 leading-tight">
					<p className="whitespace-nowrap text-base font-bold text-foreground">
						{player.kills} / <span className="text-loss">{player.deaths}</span> / {player.assists}
					</p>
					<p className="text-[11px] text-muted-foreground">{kda === null ? "Perfect" : `${kda} KDA`}</p>
				</div>

				<div className="hidden gap-1 md:flex">
					{!arena && <Stat value={cs} label={`CS ${csPerMinute(cs, info.gameDuration)}`} />}
					<Stat value={`${killParticipation(player, info.participants)}%`} label="KP" />
					{ranked && (
						<Stat
							value={lpChange === null ? "—" : `${lpChange >= 0 ? "+" : ""}${lpChange}`}
							label="LP"
							className={lpChange === null ? "text-muted-foreground" : lpChange >= 0 ? "text-win" : "text-loss"}
						/>
					)}
				</div>

				<div className="ml-auto flex basis-full flex-col items-start gap-1 sm:basis-auto sm:items-end">
					<ItemSlots version={version} items={participantItems(player)} size={22} />
					{badgeIds.length > 0 && <MatchBadges badgeIds={badgeIds} max={2} />}
				</div>

				<ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
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
						<MatchRowExpanded match={match} puuid={player.puuid} version={version} />
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
