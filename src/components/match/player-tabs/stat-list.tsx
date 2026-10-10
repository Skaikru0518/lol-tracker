import { type StatLine } from "@/lib/match/detail";

/** Titled label/value rows for one stat group. */
export function StatList({ title, stats }: { title: string; stats: StatLine[] }) {
	return (
		<div>
			<p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
			<dl className="space-y-1 text-sm">
				{stats.map((s) => (
					<div key={s.label} className="flex justify-between gap-3">
						<dt className="text-muted-foreground">{s.label}</dt>
						<dd className="font-medium tabular-nums text-foreground">{s.value}</dd>
					</div>
				))}
			</dl>
		</div>
	);
}
