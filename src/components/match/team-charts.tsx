import DamageChart from "@/components/match/damage-chart";
import GoldChart from "@/components/match/gold-chart";
import { TimelineChartSlot } from "@/components/match/timeline-slot";
import { type TimelineState } from "@/lib/match/detail";
import { type Match } from "@/lib/validators/match";
import { type Timeline } from "@/lib/validators/timeline";

/** Team gold advantage and damage dealt side by side; the gold slot waits for the timeline. */
export function TeamCharts({ match, timeline, timelineState }: { match: Match; timeline?: Timeline; timelineState: TimelineState }) {
	return (
		<div className="grid gap-4 lg:grid-cols-2">
			<TimelineChartSlot title="Team gold advantage" state={timelineState}>
				<GoldChart timeline={timeline} />
			</TimelineChartSlot>
			<DamageChart participants={match.info.participants} />
		</div>
	);
}
