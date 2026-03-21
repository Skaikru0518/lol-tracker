"use client";

import { type Match } from "@/lib/validators/match";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSummonerIcon } from "@/lib/icon-helpers";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

interface RecentPlayersProps {
	matches?: Match[];
	puuid: string;
	version?: string;
}

interface PlayerStat {
	puuid: string;
	gameName: string;
	tagLine: string;
	profileIcon: number;
	games: number;
	wins: number;
}

export default function RecentPlayers({
	matches,
	puuid,
	version,
}: RecentPlayersProps) {
	const players = useMemo(() => {
		if (!matches) return [];

		const map = new Map<string, PlayerStat>();

		for (const match of matches) {
			const me = match.info.participants.find((p) => p.puuid === puuid);
			if (!me) continue;

			const teammates = match.info.participants.filter(
				(p) => p.teamId === me.teamId && p.puuid !== puuid,
			);

			for (const t of teammates) {
				const existing = map.get(t.puuid) ?? {
					puuid: t.puuid,
					gameName: t.riotIdGameName,
					tagLine: t.riotIdTagline,
					profileIcon: t.profileIcon,
					games: 0,
					wins: 0,
				};
				existing.games++;
				if (t.win) existing.wins++;
				map.set(t.puuid, existing);
			}
		}

		return [...map.values()]
			.sort((a, b) => b.games - a.games)
			.slice(0, 5);
	}, [matches, puuid]);

	if (players.length === 0) return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
					Recently Played With
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{players.map((p) => {
					const wr = Math.round((p.wins / p.games) * 100);
					return (
						<Link
							key={p.puuid}
							href={`/summoner/${p.gameName}-${p.tagLine}`}
							className="flex items-center gap-3 rounded-lg p-2 -mx-2 transition-colors hover:bg-accent/30"
						>
							{version ? (
								<Image
									src={getSummonerIcon(version, p.profileIcon)}
									alt={p.gameName}
									width={36}
									height={36}
									className="rounded-lg"
								/>
							) : (
								<div className="size-9 rounded-lg bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
									{p.gameName[0]?.toUpperCase()}
								</div>
							)}
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium truncate">
									{p.gameName}
									<span className="ml-1 text-xs text-muted-foreground">
										#{p.tagLine}
									</span>
								</p>
								<p className="text-xs text-muted-foreground">
									{p.games} game{p.games > 1 ? "s" : ""}
								</p>
							</div>
							<div className="text-right">
								<p
									className={`text-sm font-medium ${
										wr >= 50
											? "text-win"
											: "text-loss"
									}`}
								>
									{wr}%
								</p>
							</div>
						</Link>
					);
				})}
			</CardContent>
		</Card>
	);
}
