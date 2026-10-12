"use client";

import { Panel, PanelBody } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryCard } from "@/components/match/performance/category-card";
import { OpponentDiff } from "@/components/match/performance/opponent-diff";
import { ScoreCircle } from "@/components/match/performance/score-circle";
import { useMatchPerformance } from "@/hooks/usePerformance";
import { ROLE_LABELS } from "@/lib/performance/roles";
import { type PlayerTabProps } from "./player-tabs";

export function PerformanceTab({ match, player, version }: PlayerTabProps) {
	const matchId = match.metadata.matchId;
	const { data, isLoading, isError } = useMatchPerformance(matchId);
	const performance = data?.[player.puuid];

	if (isLoading) return <Skeleton className="h-72" />;
	if (isError) {
		return (
			<Panel>
				<EmptyState title="Performance unavailable" description="Try again in a moment." />
			</Panel>
		);
	}
	if (!performance) {
		return (
			<Panel>
				<EmptyState title="No performance score" description="Scores are given for ranked Solo, Flex and 5s games with a known role, once enough games are tracked for that role." />
			</Panel>
		);
	}

	const roleLabel = ROLE_LABELS[performance.role];
	return (
		<div className="space-y-4">
			<Panel>
				<PanelBody className="flex flex-wrap items-center gap-6">
					<ScoreCircle score={performance.score} grade={performance.grade} size="lg" />
					<div>
						<p className="text-sm text-muted-foreground">{roleLabel}</p>
						<p className="text-2xl font-bold text-foreground">Grade {performance.grade}</p>
					</div>
					{performance.opponent && (
						<div className="ml-auto">
							<OpponentDiff opponent={performance.opponent} version={version} />
						</div>
					)}
				</PanelBody>
			</Panel>
			<div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
				{performance.categories.map((c) => (
					<CategoryCard key={c.id} category={c} roleLabel={`${roleLabel} players`} />
				))}
			</div>
			<p className="text-xs text-muted-foreground">
				Compared with {performance.baselineGames.toLocaleString("en-US")} {roleLabel} players from ranked games in the last 60 days.
			</p>
		</div>
	);
}
