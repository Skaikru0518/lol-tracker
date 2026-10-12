import { StatRing } from "@/components/ui/stat-ring";
import { type RecentSummaryPayload } from "@/lib/validators/performance";

export function WinrateBlock({ summary }: { summary: RecentSummaryPayload }) {
	return (
		<div className="flex flex-col items-center gap-1">
			<StatRing label="Winrate" value={summary.winRate} display={`${summary.winRate}%`} color={summary.winRate >= 50 ? "var(--win)" : "var(--loss)"} />
			<p className="text-xs text-muted-foreground">
				{summary.wins}W – {summary.losses}L
			</p>
		</div>
	);
}
