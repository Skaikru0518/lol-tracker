interface ChangelogTableProps {
	rows: { name: string; requirement: string }[];
}

export function ChangelogTable({ rows }: ChangelogTableProps) {
	return (
		<div className="mt-2 mb-2 overflow-x-auto rounded-lg border border-border/30">
			<table className="w-full text-sm!">
				<thead>
					<tr className="border-b border-border/30 bg-muted/30">
						<th className="px-3 py-2 text-left font-semibold">Name</th>
						<th className="px-3 py-2 text-left font-semibold">Requirement</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row, i) => (
						<tr key={i} className="border-b border-border/10 last:border-0">
							<td className="px-3 py-1.5 font-medium whitespace-nowrap">{row.name}</td>
							<td className="px-3 py-1.5 text-muted-foreground">{row.requirement}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
