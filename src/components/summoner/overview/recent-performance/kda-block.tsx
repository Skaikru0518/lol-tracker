import { type RecentSummaryPayload } from "@/lib/validators/performance";

export function KdaBlock({ summary }: { summary: RecentSummaryPayload }) {
	return (
		<div className="text-center">
			<p className="text-xs font-medium text-muted-foreground">KDA</p>
			<p className="text-3xl font-bold text-foreground">{summary.kda}</p>
			<p className="text-xs text-muted-foreground">
				{summary.kills} / <span className="text-loss">{summary.deaths}</span> / {summary.assists}
			</p>
		</div>
	);
}
