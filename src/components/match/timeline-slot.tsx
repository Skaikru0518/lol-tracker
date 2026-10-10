import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { type TimelineState } from "@/lib/match/detail";

/** Timeline-based content: a skeleton while loading, an empty state when Riot sent no timeline, else the children. */
export function TimelinePart({ state, height = "h-24", children }: { state: TimelineState; height?: string; children: React.ReactNode }) {
	if (state === "loading") return <Skeleton className={height} />;
	if (state === "missing") return <EmptyState title="Timeline not available" description="Riot did not return a timeline for this match." />;
	return <>{children}</>;
}

/** A self-contained timeline chart, or a titled panel holding its skeleton or empty state until the timeline is ready. */
export function TimelineChartSlot({ title, state, children }: { title: string; state: TimelineState; children: React.ReactNode }) {
	if (state === "ready") return <>{children}</>;
	return (
		<Panel>
			<PanelHeader title={title} />
			<PanelBody>
				<TimelinePart state={state} height="h-56">
					{null}
				</TimelinePart>
			</PanelBody>
		</Panel>
	);
}
