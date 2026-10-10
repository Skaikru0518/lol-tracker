import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { type ChangelogEntry } from "@/components/changelog/changelog-type";
import { CATEGORY_META, categoryCounts, categoryLabel, formatEntryDate } from "@/lib/changelog/summary";

/** The two newest changelog entries with summary and category counts, linking to each entry. */
export function WhatsNew({ entries }: { entries: ChangelogEntry[] }) {
	return (
		<Panel>
			<PanelHeader
				title="What's new"
				actions={
					<Link href="/changelog" className="text-xs font-medium text-primary hover:underline">
						Changelog &rarr;
					</Link>
				}
			/>
			{entries.length === 0 ? (
				<PanelBody className="text-sm text-muted-foreground">No changes published yet.</PanelBody>
			) : (
				<ul className="divide-y divide-border/50">
					{entries.map((entry) => (
						<li key={entry.slug} className="space-y-1.5 px-4 py-3">
							<p className="text-xs text-muted-foreground">{formatEntryDate(entry.date, "short")}</p>
							<Link href={`/changelog/${entry.slug}`} className="block font-semibold text-foreground hover:text-primary">
								{entry.title}
							</Link>
							<p className="line-clamp-2 text-sm text-muted-foreground">{entry.summary}</p>
							<div className="flex flex-wrap gap-1.5 pt-0.5">
								{categoryCounts(entry).map(({ category, count }) => (
									<Chip key={category} color={CATEGORY_META[category].color}>
										{categoryLabel(category, count)}
									</Chip>
								))}
							</div>
						</li>
					))}
				</ul>
			)}
		</Panel>
	);
}
