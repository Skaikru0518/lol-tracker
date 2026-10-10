import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRankLabel } from "@/lib/rank-calculator";
import { type LpChangeRow } from "@/lib/lp-history/summary";

const VISIBLE_ROWS = 50;

function ChangeCell({ row }: { row: LpChangeRow }) {
	if (row.kind === "start" || row.delta === null) return <span className="text-muted-foreground">—</span>;
	const sign = row.delta > 0 ? "+" : "";
	const tone = row.delta > 0 ? "text-win" : row.delta < 0 ? "text-loss" : "text-muted-foreground";
	const suffix = row.kind === "promotion" ? " · promoted" : row.kind === "demotion" ? " · demoted" : "";
	return (
		<span className={tone}>
			{sign}
			{row.delta}
			{suffix}
		</span>
	);
}

/** Newest-first LP snapshots with their change. */
export function LpChangesTable({ rows }: { rows: LpChangeRow[] }) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Date</TableHead>
					<TableHead>Rank</TableHead>
					<TableHead className="text-right">LP</TableHead>
					<TableHead>Change</TableHead>
					<TableHead className="hidden text-right sm:table-cell">W/L</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.slice(0, VISIBLE_ROWS).map((row) => (
					<TableRow key={row.id}>
						<TableCell className="text-muted-foreground">
							{new Date(row.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
						</TableCell>
						<TableCell>{formatRankLabel(row.tier, row.rank)}</TableCell>
						<TableCell className="text-right">{row.lp}</TableCell>
						<TableCell>
							<ChangeCell row={row} />
						</TableCell>
						<TableCell className="hidden text-right text-muted-foreground sm:table-cell">
							{row.wins !== null && row.losses !== null ? `${row.wins}/${row.losses}` : "—"}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
