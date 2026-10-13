import { cn } from "@/lib/utils";
import { ScoreCircle } from "@/components/match/performance/score-circle";
import { type RecentSummaryPayload } from "@/lib/validators/performance";

function Count({ label, value, color }: { label: string; value: number; color: string }) {
	return (
		<span className="rounded px-1.5 py-0.5 text-3xs font-extrabold" style={{ color, backgroundColor: `${color}22` }}>
			{label} ×{value}
		</span>
	);
}

export function SummaryHeadline({ summary }: { summary: RecentSummaryPayload }) {
	return (
		<div className="flex shrink-0 items-center gap-3.5">
			{summary.score && <ScoreCircle score={summary.score.average} grade={summary.score.grade} size="lg" />}
			<div>
				<p className="text-xs font-medium text-muted-foreground">{summary.score ? "Avg score · Winrate" : "Winrate"}</p>
				<p className="mt-0.5 text-xl font-extrabold">
					<span className={cn(summary.winRate >= 50 ? "text-win" : "text-loss")}>{summary.winRate}%</span>{" "}
					<span className="text-sm font-medium text-muted-foreground">
						{summary.wins}W – {summary.losses}L
					</span>
				</p>
				{summary.score && (
					<div className="mt-1.5 flex gap-1.5">
						<Count label="MVP" value={summary.mvp} color="#f5c542" />
						<Count label="ACE" value={summary.ace} color="#a78bfa" />
					</div>
				)}
			</div>
		</div>
	);
}
