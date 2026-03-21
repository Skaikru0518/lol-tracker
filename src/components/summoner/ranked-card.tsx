"use client";

import { type RankedEntry } from "@/lib/validators/ranked";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRankEmblem, RANK_COLORS } from "@/lib/icon-helpers";
import Image from "next/image";

interface RankedCardProps {
	entries?: RankedEntry[];
}

const QUEUE_LABELS: Record<string, string> = {
	RANKED_SOLO_5x5: "Solo/Duo",
	RANKED_FLEX_SR: "Flex",
};

export default function RankedCard({ entries }: RankedCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
					Ranked
				</CardTitle>
			</CardHeader>
			<CardContent>
				{!entries || entries.length === 0 ? (
					<p className="text-base text-muted-foreground">Unranked</p>
				) : (
					<div className="space-y-6">
						{entries.map((entry) => {
							const totalGames = entry.wins + entry.losses;
							const winRate = Math.round(
								(entry.wins / totalGames) * 100,
							);
							const color =
								RANK_COLORS[entry.tier] ?? "#888";

							return (
								<div
									key={entry.queueType}
									className="flex items-center gap-5"
								>
									<Image
										src={getRankEmblem(entry.tier)}
										alt={entry.tier}
										width={80}
										height={80}
										className="shrink-0"
									/>
									<div className="flex-1">
										<span className="text-sm text-muted-foreground">
											{QUEUE_LABELS[entry.queueType] ??
												entry.queueType}
										</span>
										<p
											className="text-2xl font-bold tracking-tight"
											style={{ color }}
										>
											{entry.tier} {entry.rank}
										</p>
										<p className="text-base text-muted-foreground">
											{entry.leaguePoints} LP
										</p>
										<p className="text-sm text-muted-foreground">
											{entry.wins}W {entry.losses}L ·{" "}
											{winRate}%
										</p>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
