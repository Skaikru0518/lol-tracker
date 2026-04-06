"use client";

import { useState, useMemo } from "react";
import { type Match } from "@/lib/validators/match";
import {
	type RuneData,
	type RuneStyle,
	getChampionDisplayName,
} from "@/lib/icon-helpers";
import { getQueueName } from "@/lib/queue-names";
import MatchCard from "./match-card";
import { type LPSnapshot } from "@/hooks/useLPHistory";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const QUEUE_FILTERS = [
	{ label: "All", value: "all" },
	{ label: "Ranked Solo", value: "ranked-solo" },
	{ label: "Ranked Flex", value: "ranked-flex" },
	{ label: "ARAM", value: "aram" },
	{ label: "Normal", value: "normal" },
] as const;

type QueueFilter = (typeof QUEUE_FILTERS)[number]["value"];

function filterMatchesByQueue(matches: Match[], filter: QueueFilter): Match[] {
	switch (filter) {
		case "all":
			return matches;
		case "ranked-solo":
			return matches.filter((m) => m.info.queueId === 420);
		case "ranked-flex":
			return matches.filter((m) => m.info.queueId === 440);
		case "aram":
			return matches.filter((m) => m.info.queueId === 450);
		case "normal":
			return matches.filter(
				(m) => m.info.queueId === 400 || m.info.queueId === 430,
			);
	}
}

function filterMatchesByChampion(
	matches: Match[],
	puuid: string,
	championName: string | null,
): Match[] {
	if (!championName) return matches;
	return matches.filter((m) =>
		m.info.participants.some(
			(p) => p.puuid === puuid && p.championName === championName,
		),
	);
}

interface PlayedChampion {
	championName: string;
	displayName: string;
	games: number;
}

function calculateLPChange(
	snapshots: LPSnapshot[] | undefined,
	matchEndTime: number,
): number | null {
	if (!snapshots || snapshots.length < 2) return null;

	// Find the closest snapshot AFTER the match ended, and the one BEFORE
	const sorted = [...snapshots].sort(
		(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
	);

	let before: LPSnapshot | null = null;
	let after: LPSnapshot | null = null;

	for (const snap of sorted) {
		const snapTime = new Date(snap.createdAt).getTime();
		if (snapTime <= matchEndTime) {
			before = snap;
		} else if (!after) {
			after = snap;
		}
	}

	if (!before || !after) return null;

	// Simple LP diff — same tier
	if (before.tier === after.tier && before.rank === after.rank) {
		return after.lp - before.lp;
	}

	// Tier/rank change — estimate based on tier points
	const TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
	const DIVS = ["IV", "III", "II", "I"];

	function toAbsoluteLP(tier: string, rank: string, lp: number): number {
		const tierIdx = TIERS.indexOf(tier);
		if (tierIdx === -1) return 0;
		if (tierIdx >= 7) return tierIdx * 400 + lp; // Master+
		const divIdx = DIVS.indexOf(rank);
		return tierIdx * 400 + (divIdx >= 0 ? divIdx : 0) * 100 + lp;
	}

	const beforeLP = toAbsoluteLP(before.tier, before.rank, before.lp);
	const afterLP = toAbsoluteLP(after.tier, after.rank, after.lp);
	return afterLP - beforeLP;
}

interface MatchListProps {
	matches?: Match[];
	puuid: string;
	version?: string;
	isLoading?: boolean;
	runeData?: { runes: Map<number, RuneData>; styles: Map<number, RuneStyle> };
	soloHistory?: LPSnapshot[];
	flexHistory?: LPSnapshot[];
}

export function MatchList({
	matches,
	puuid,
	version,
	isLoading,
	runeData,
	soloHistory,
	flexHistory,
}: MatchListProps) {
	const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
	const [championFilter, setChampionFilter] = useState<string | null>(null);
	const [visibleCount, setVisibleCount] = useState(20);

	const playedChampions = useMemo<PlayedChampion[]>(() => {
		if (!matches) return [];
		const champCount = new Map<string, number>();
		for (const match of matches) {
			const player = match.info.participants.find((p) => p.puuid === puuid);
			if (player) {
				champCount.set(
					player.championName,
					(champCount.get(player.championName) || 0) + 1,
				);
			}
		}
		return [...champCount.entries()]
			.map(([name, games]) => ({
				championName: name,
				displayName: getChampionDisplayName(name),
				games,
			}))
			.sort((a, b) => b.games - a.games);
	}, [matches, puuid]);

	if (isLoading) {
		return (
			<div className="space-y-2">
				{Array.from({ length: 5 }).map((_, i) => (
					<Skeleton key={i} className="h-[68px] w-full rounded-xl" />
				))}
			</div>
		);
	}

	if (!matches || matches.length === 0) {
		return (
			<div className="flex h-40 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
				No matches found
			</div>
		);
	}

	const afterQueueFilter = filterMatchesByQueue(matches, queueFilter);
	const filteredMatches = filterMatchesByChampion(
		afterQueueFilter,
		puuid,
		championFilter,
	);

	return (
		<div className="space-y-2 flex flex-col min-h-[400px] lg:min-w-[700px]">
			<h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
				Recent Matches
			</h3>
			<div className="mb-2 flex flex-wrap items-center gap-1.5">
				{QUEUE_FILTERS.map((filter) => (
					<button
						key={filter.value}
						onClick={() => setQueueFilter(filter.value)}
						className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
							queueFilter === filter.value
								? "bg-primary text-primary-foreground"
								: "bg-secondary text-secondary-foreground hover:bg-accent/30"
						}`}
					>
						{filter.label}
					</button>
				))}
				<Select
					value={championFilter ?? "all"}
					onValueChange={(v) => setChampionFilter(v === "all" ? null : v)}
				>
					<SelectTrigger className="ml-auto rounded-full px-3 py-1">
						<SelectValue placeholder="All Champions" />
					</SelectTrigger>
					<SelectContent
						className="rounded-xl"
						position="popper"
						side="bottom"
						sideOffset={4}
					>
						<SelectItem value="all">All Champions</SelectItem>
						{playedChampions.map((c) => (
							<SelectItem key={c.championName} value={c.championName}>
								{c.displayName} ({c.games})
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			{filteredMatches.length === 0 ? (
				<div className="flex h-24 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
					No matches found for this filter
				</div>
			) : (
				<>
					{filteredMatches.slice(0, visibleCount).map((match, i) => {
						const player = match.info.participants.find(
							(p) => p.puuid === puuid,
						);
						if (!player) return null;

						const matchEndTime = match.info.gameCreation + match.info.gameDuration * 1000;
						const history = match.info.queueId === 440 ? flexHistory : soloHistory;
						const lpChange = (match.info.queueId === 420 || match.info.queueId === 440)
							? calculateLPChange(history, matchEndTime)
							: null;

						return (
							<MatchCard
								key={match.metadata.matchId}
								matchId={match.metadata.matchId}
								player={player}
								participants={match.info.participants}
								queueName={getQueueName(
									match.info.queueId,
									match.info.gameMode,
								)}
								queueId={match.info.queueId}
								gameDuration={match.info.gameDuration}
								gameCreation={match.info.gameCreation}
								version={version}
								index={i}
								runeData={runeData}
								lpChange={lpChange}
							/>
						);
					})}
					{visibleCount < filteredMatches.length && (
						<Button
							variant="outline"
							className="w-full"
							onClick={() => setVisibleCount((prev) => prev + 10)}
						>
							Load More
						</Button>
					)}
				</>
			)}
		</div>
	);
}
