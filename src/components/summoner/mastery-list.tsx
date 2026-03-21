"use client";

import { type ChampionMastery } from "@/lib/validators/mastery";
import { type Champion } from "@/lib/icon-helpers";
import { getChampionIcon } from "@/lib/icon-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import CountUp from "@/components/CountUp";

interface MasteryListProps {
	masteries?: ChampionMastery[];
	champions?: Record<number, Champion>;
	version?: string;
	summonerSlug?: string;
}

export default function MasteryList({
	masteries,
	champions,
	version,
	summonerSlug,
}: MasteryListProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
					Top Champions
				</CardTitle>
			</CardHeader>
			<CardContent>
				{!masteries || masteries.length === 0 ? (
					<p className="text-base text-muted-foreground">No data</p>
				) : (
					<div className="space-y-4">
						{masteries.map((m, i) => {
							const champ = champions?.[m.championId];
							return (
								<Link
									key={m.championId}
									href={summonerSlug && champ ? `/summoner/${summonerSlug}/${champ.id}` : "#"}
									className="flex items-center gap-4 rounded-lg p-1 -mx-1 transition-colors hover:bg-accent/30"
								>
									<span className="w-5 text-base text-muted-foreground text-right font-medium">
										{i + 1}
									</span>
									{champ && version ? (
										<Image
											src={getChampionIcon(
												version,
												champ.id,
											)}
											alt={champ.name}
											width={48}
											height={48}
											className="rounded-xl"
										/>
									) : (
										<div className="size-12 rounded-xl bg-muted animate-pulse" />
									)}
									<div className="flex-1 min-w-0">
										<p className="text-base font-semibold truncate">
											{champ?.name ??
												`Champion ${m.championId}`}
										</p>
										<p className="text-sm text-muted-foreground">
											Mastery {m.championLevel} ·{" "}
											<CountUp to={m.championPoints} duration={0.5} separator="," />{" "}
											pts
										</p>
									</div>
								</Link>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
