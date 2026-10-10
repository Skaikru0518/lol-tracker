import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** Achievement or badge requirements of a change as a name/requirement table. */
export function ChangelogTable({ rows }: { rows: { name: string; requirement: string }[] }) {
	return (
		<div className="mt-3 overflow-hidden rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Requirement</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.map((row) => (
						<TableRow key={row.name}>
							<TableCell className="whitespace-nowrap font-medium text-foreground">{row.name}</TableCell>
							<TableCell className="text-muted-foreground">{row.requirement}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
