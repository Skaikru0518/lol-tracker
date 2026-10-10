"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRankLabel } from "@/lib/game/rank-calculator";
import { dayKeyToDate, groupChangesByDay, type LpChangeRow } from "@/lib/lp-history/summary";
import { paginate } from "@/lib/shared/pagination";

const DAYS_PER_PAGE = 30;

const dayLabel = (day: string) => dayKeyToDate(day).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

function Delta({ value, suffix = "" }: { value: number | null; suffix?: string }) {
	if (value === null) return <span className="text-muted-foreground">—</span>;
	const tone = value > 0 ? "text-win" : value < 0 ? "text-loss" : "text-muted-foreground";
	return (
		<span className={tone}>
			{value > 0 ? "+" : ""}
			{value}
			{suffix}
		</span>
	);
}

const kindSuffix = (row: LpChangeRow) => (row.kind === "promotion" ? " · promoted" : row.kind === "demotion" ? " · demoted" : "");

/** LP changes grouped into collapsible days, newest first, 30 days per page; each day shows its final rank, net LP and W/L. */
export function LpChangesTable({ rows }: { rows: LpChangeRow[] }) {
	const groups = useMemo(() => groupChangesByDay(rows), [rows]);
	const [open, setOpen] = useState<Set<string>>(new Set());
	const [pageIndex, setPageIndex] = useState(0);
	const { items: days, page, pageCount } = paginate(groups, pageIndex, DAYS_PER_PAGE);
	const toggle = (day: string) =>
		setOpen((prev) => {
			const next = new Set(prev);
			if (next.has(day)) next.delete(day);
			else next.add(day);
			return next;
		});

	return (
		<>
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
					{days.map((group) => {
						const expanded = open.has(group.day);
						return (
							<Fragment key={group.day}>
								<TableRow className="bg-muted/30">
									<TableCell>
										<button
											type="button"
											onClick={() => toggle(group.day)}
											aria-expanded={expanded}
											className="flex items-center gap-1 font-medium text-foreground"
										>
											<ChevronRight className={cn("size-3.5 transition-transform", expanded && "rotate-90")} />
											{dayLabel(group.day)}
											<span className="text-xs font-normal text-muted-foreground">
												· {group.wins + group.losses} {group.wins + group.losses === 1 ? "game" : "games"}
											</span>
										</button>
									</TableCell>
									<TableCell>{formatRankLabel(group.latest.tier, group.latest.rank)}</TableCell>
									<TableCell className="text-right">{group.latest.lp}</TableCell>
									<TableCell>
										<Delta value={group.delta} />
									</TableCell>
									<TableCell className="hidden text-right sm:table-cell">
										<span className="text-win">{group.wins}W</span> <span className="text-loss">{group.losses}L</span>
									</TableCell>
								</TableRow>
								{expanded &&
									group.rows.map((row) => (
										<TableRow key={row.id}>
											<TableCell className="pl-9 text-muted-foreground">{timeLabel(row.createdAt)}</TableCell>
											<TableCell>{formatRankLabel(row.tier, row.rank)}</TableCell>
											<TableCell className="text-right">{row.lp}</TableCell>
											<TableCell>
												{row.kind === "reset" ? (
													<span className="text-muted-foreground">new season</span>
												) : (
													<Delta value={row.kind === "start" ? null : row.delta} suffix={kindSuffix(row)} />
												)}
											</TableCell>
											<TableCell className="hidden text-right text-muted-foreground sm:table-cell">
												{row.wins !== null && row.losses !== null ? `${row.wins}/${row.losses}` : "—"}
											</TableCell>
										</TableRow>
									))}
							</Fragment>
						);
					})}
				</TableBody>
			</Table>
			{pageCount > 1 && (
				<div className="flex items-center justify-end gap-2 border-t px-4 py-2 text-xs text-muted-foreground">
					<Button variant="ghost" size="sm" onClick={() => setPageIndex(page - 1)} disabled={page === 0} aria-label="Newer days">
						<ChevronLeft className="size-4" />
					</Button>
					<span>
						{page + 1} / {pageCount}
					</span>
					<Button variant="ghost" size="sm" onClick={() => setPageIndex(page + 1)} disabled={page === pageCount - 1} aria-label="Older days">
						<ChevronRight className="size-4" />
					</Button>
				</div>
			)}
		</>
	);
}
