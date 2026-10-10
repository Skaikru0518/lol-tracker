import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { type ChangelogEntry } from "../changelog-type";
import { CATEGORY_META, categoryCounts, categoryLabel, formatEntryDate, groupChanges } from "@/lib/changelog/summary";
import { ChangelogTable } from "./changelog-table";

/** One changelog entry: back link, date, title, summary and count chips, then one panel per category. */
export function ChangelogDetail({ entry }: { entry: ChangelogEntry }) {
	return (
		<div className="space-y-6">
			<div>
				<Link href="/changelog" className="text-xs font-medium text-primary hover:underline">
					&larr; Changelog
				</Link>
				<p className="mt-4 text-sm text-muted-foreground">
					{formatEntryDate(entry.date, "long")}
				</p>
				<h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">{entry.title}</h1>
				<p className="mt-3 text-muted-foreground">{entry.summary}</p>
				<div className="mt-4 flex flex-wrap gap-1.5">
					{categoryCounts(entry).map(({ category, count }) => (
						<a key={category} href={`#${category}`}>
							<Chip color={CATEGORY_META[category].color}>
								{categoryLabel(category, count)}
							</Chip>
						</a>
					))}
				</div>
			</div>
			{groupChanges(entry).map(({ category, items }) => (
				<Panel key={category} id={category} className="scroll-mt-20">
					<PanelHeader
						title={
							<span className="flex items-center gap-2">
								<span className="size-2 rounded-full" style={{ background: CATEGORY_META[category].color }} />
								{CATEGORY_META[category].plural}
								<span className="text-xs font-normal text-muted-foreground">{items.length}</span>
							</span>
						}
					/>
					<ul className="divide-y divide-border/50">
						{items.map((change) => (
							<li key={change.title} className="px-4 py-4">
								<h3 className="font-semibold text-foreground">{change.title}</h3>
								<p className="mt-1 text-sm leading-relaxed text-muted-foreground">{change.description}</p>
								{change.img && <img src={change.img} alt={change.title} className="mt-3 w-full rounded-md border" />}
								{change.table && <ChangelogTable rows={change.table} />}
							</li>
						))}
					</ul>
				</Panel>
			))}
		</div>
	);
}
