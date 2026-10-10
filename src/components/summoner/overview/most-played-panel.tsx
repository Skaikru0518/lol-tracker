"use client";

import { useState } from "react";
import Link from "next/link";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChampionStats } from "@/hooks/useChampionStats";
import { getChampionDisplayName } from "@/lib/icon-helpers";
import { type QueueFilter } from "@/lib/champion-stats/queue";

const QUEUE_OPTIONS: { value: QueueFilter; label: string }[] = [
	{ value: "all", label: "All queues" },
	{ value: "solo", label: "Ranked Solo" },
	{ value: "flex", label: "Ranked Flex" },
];

/** Top five champions from the stored-match stats, with a link to the Champions tab. */
export function MostPlayedPanel({ puuid, version, basePath }: { puuid: string; version: string; basePath: string }) {
	const [queue, setQueue] = useState<QueueFilter>("all");
	const { data: stats, isLoading } = useChampionStats(puuid, queue);
	const top = stats?.slice(0, 5) ?? [];
	const maxGames = top[0]?.games ?? 1;

	return (
		<Panel>
			<PanelHeader
				title="Most played"
				actions={
					<Select value={queue} onValueChange={(v) => setQueue(v as QueueFilter)}>
						<SelectTrigger size="sm" className="h-7 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent position="popper">
							{QUEUE_OPTIONS.map((o) => (
								<SelectItem key={o.value} value={o.value}>
									{o.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				}
			/>
			{isLoading ? (
				<PanelBody className="space-y-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-9" />
					))}
				</PanelBody>
			) : top.length === 0 ? (
				<EmptyState title="No games in this queue" />
			) : (
				<PanelBody className="space-y-3">
					{top.map((s) => (
						<div key={s.championId} className="flex items-center gap-3">
							<ChampionIcon version={version} championName={s.championName} size={32} />
							<div className="min-w-0 flex-1">
								<div className="flex items-baseline justify-between gap-2 text-sm">
									<span className="truncate font-semibold text-foreground">{getChampionDisplayName(s.championName)}</span>
									<span className="text-xs text-muted-foreground">{s.kda} KDA</span>
								</div>
								<div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
									<div className="h-full rounded-full bg-primary" style={{ width: `${(s.games / maxGames) * 100}%` }} />
								</div>
							</div>
							<div className="w-12 text-right text-sm">
								<p className="font-semibold text-foreground">{s.games}</p>
								<p className={`text-xs ${s.winRate >= 50 ? "text-win" : "text-loss"}`}>{Math.round(s.winRate)}%</p>
							</div>
						</div>
					))}
					<Link href={`${basePath}/champions`} className="block text-center text-xs font-medium text-primary hover:underline">
						See all champions &rarr;
					</Link>
				</PanelBody>
			)}
		</Panel>
	);
}
