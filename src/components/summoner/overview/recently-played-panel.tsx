"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { getSummonerIcon } from "@/lib/game/icon-helpers";
import { toSummonerSlug } from "@/lib/game/riot-id";
import { getRecentTeammates } from "@/lib/summoner/matches/teammates";
import { type Match } from "@/lib/validators/match";

/** Teammates from at least two of the loaded games, linking to their profiles. */
export function RecentlyPlayedPanel({ matches, puuid, version }: { matches: Match[]; puuid: string; version: string }) {
	const teammates = useMemo(() => getRecentTeammates(matches, puuid), [matches, puuid]);

	return (
		<Panel>
			<PanelHeader title="Recently played with" />
			{teammates.length === 0 ? (
				<EmptyState title="No repeat teammates" description="Players you queued with twice or more show up here." />
			) : (
				<PanelBody className="space-y-1 p-2">
					{teammates.map((t) => {
						const winRate = Math.round((t.wins / t.games) * 100);
						return (
							<Link
								key={t.puuid}
								href={`/summoner/${toSummonerSlug(t.gameName, t.tagLine)}`}
								className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent"
							>
								<img src={getSummonerIcon(version, t.profileIcon)} alt="" width={32} height={32} className="size-8 rounded-md" />
								<div className="min-w-0 flex-1 text-sm">
									<p className="truncate font-medium text-foreground">
										{t.gameName}
										<span className="ml-1 text-muted-foreground">#{t.tagLine}</span>
									</p>
									<p className="text-xs text-muted-foreground">{t.games} games</p>
								</div>
								<span className={`text-sm font-medium ${winRate >= 50 ? "text-win" : "text-loss"}`}>{winRate}%</span>
							</Link>
						);
					})}
				</PanelBody>
			)}
		</Panel>
	);
}
