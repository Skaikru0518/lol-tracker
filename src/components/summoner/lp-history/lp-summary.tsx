import { formatRankLabel } from "@/lib/game/rank-calculator";
import { RANK_COLORS } from "@/lib/game/icon-helpers";
import { type LpSummaryData } from "@/lib/lp-history/summary";
import { type LPSnapshot } from "@/lib/validators/lp-history";

function RankValue({ label, snap }: { label: string; snap: LPSnapshot | null }) {
	return (
		<div>
			<p className="text-xs text-muted-foreground">{label}</p>
			{snap ? (
				<p className="text-base font-bold" style={{ color: RANK_COLORS[snap.tier] }}>
					{formatRankLabel(snap.tier, snap.rank)} <span className="text-sm font-medium text-muted-foreground">{snap.lp} LP</span>
				</p>
			) : (
				<p className="text-base font-bold text-muted-foreground">—</p>
			)}
		</div>
	);
}

/** Current rank, peak rank and LP change over the selected range. */
export function LpSummary({ summary, rangeLabel }: { summary: LpSummaryData; rangeLabel: string }) {
	const { change } = summary;
	return (
		<div className="flex flex-wrap gap-6 px-4 pt-4">
			<RankValue label="Current" snap={summary.current} />
			<RankValue label="Peak" snap={summary.peak} />
			<div>
				<p className="text-xs text-muted-foreground">{rangeLabel} change</p>
				<p className={`text-base font-bold ${change === null ? "text-muted-foreground" : change >= 0 ? "text-win" : "text-loss"}`}>
					{change === null ? "—" : `${change >= 0 ? "+" : ""}${change} LP`}
				</p>
			</div>
		</div>
	);
}
