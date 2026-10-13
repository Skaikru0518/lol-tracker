"use client";

import { Panel, PanelHeader } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentPerformance } from "@/hooks/usePerformance";
import { CategoryRadar } from "./category-radar";
import { SummaryHeadline } from "./summary-headline";
import { TopChampions } from "./top-champions";

export function RecentPerformancePanel({ puuid, version, newestMatchId }: { puuid: string; version?: string; newestMatchId?: string }) {
	const { data: summary, isLoading } = useRecentPerformance(puuid, newestMatchId);

	if (isLoading) return <Skeleton className="h-64" />;
	if (!summary || summary.games === 0) return null;

	return (
		<Panel className="@container">
			<PanelHeader title={`Last ${summary.games} ranked games`} />
			<div className="flex flex-wrap items-center justify-evenly gap-x-4 gap-y-6 p-4 @min-[48rem]:flex-nowrap">
				<SummaryHeadline summary={summary} />
				{version && <TopChampions champions={summary.champions} version={version} />}
				{summary.score && summary.categories.length > 0 && <CategoryRadar categories={summary.categories} grade={summary.score.grade} />}
			</div>
		</Panel>
	);
}
