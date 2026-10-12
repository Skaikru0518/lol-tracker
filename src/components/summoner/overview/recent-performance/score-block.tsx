import { ScoreCircle } from "@/components/match/performance/score-circle";
import { type RecentSummaryPayload } from "@/lib/validators/performance";

function Count({ label, value, color }: { label: string; value: number; color: string }) {
	return (
		<div className="text-center">
			<span className="rounded px-1.5 py-0.5 text-3xs font-bold" style={{ color, backgroundColor: `${color}26` }}>
				{label}
			</span>
			<p className="mt-1 text-sm font-semibold text-foreground">×{value}</p>
		</div>
	);
}

export function ScoreBlock({ summary }: { summary: RecentSummaryPayload }) {
	if (!summary.score) return <p className="text-center text-xs text-muted-foreground">No scored games yet</p>;
	return (
		<div className="flex items-center justify-center gap-4">
			<div className="flex flex-col items-center gap-1">
				<span className="text-xs font-medium text-muted-foreground">Avg score</span>
				<ScoreCircle score={summary.score.average} grade={summary.score.grade} />
			</div>
			<div className="space-y-2">
				{summary.lobbyRank !== null && (
					<p className="text-xs text-muted-foreground">
						Lobby rank <span className="font-semibold text-foreground">{summary.lobbyRank}</span>/10
					</p>
				)}
				<div className="flex gap-3">
					<Count label="MVP" value={summary.mvp} color="#f5c542" />
					<Count label="ACE" value={summary.ace} color="#a78bfa" />
				</div>
			</div>
		</div>
	);
}
