"use client";

import { Panel, PanelHeader } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentPerformance } from "@/hooks/usePerformance";
import { CategoryBars } from "./category-bars";
import { KdaBlock } from "./kda-block";
import { ScoreBlock } from "./score-block";
import { TopChampions } from "./top-champions";
import { WinrateBlock } from "./winrate-block";

export function RecentPerformancePanel({ puuid, version, newestMatchId }: { puuid: string; version?: string; newestMatchId?: string }) {
	const { data: summary, isLoading } = useRecentPerformance(puuid, newestMatchId);

	if (isLoading) return <Skeleton className="h-48" />;
	if (!summary || summary.games === 0) return null;

	return (
		<Panel>
			<PanelHeader title={`Last ${summary.games} ranked games`} />
			<div className="space-y-4 p-4">
				<div className="grid items-center gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<WinrateBlock summary={summary} />
					{version && <TopChampions champions={summary.champions} version={version} />}
					<KdaBlock summary={summary} />
					<ScoreBlock summary={summary} />
				</div>
				{summary.categories.length > 0 && <CategoryBars categories={summary.categories} />}
			</div>
		</Panel>
	);
}
