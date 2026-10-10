import Link from "next/link";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/ui/chip";
import { type ChangelogEntry } from "../changelog-type";
import { CATEGORY_META, categoryCounts, categoryLabel, formatEntryDate } from "@/lib/changelog/summary";

/** One changelog entry on the vertical timeline: date, then a card with title, summary and category count chips. */
export function ChangelogTimelineItem({ entry, latest }: { entry: ChangelogEntry; latest: boolean }) {
	return (
		<li className="relative pb-8 pl-8 last:pb-0">
			<span className="absolute bottom-0 left-[0.4rem] top-5 w-px bg-border" />
			<span className={cn("absolute left-0 top-1.5 size-3.5 rounded-full border-2 border-background", latest ? "bg-primary" : "bg-muted-foreground")} />
			<p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{formatEntryDate(entry.date, "long")}</p>
			<Link href={`/changelog/${entry.slug}`} className="group block rounded-lg border bg-card p-5 transition-colors hover:border-primary/40">
				<h2 className="text-lg font-bold text-foreground transition-colors group-hover:text-primary">{entry.title}</h2>
				<p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{entry.summary}</p>
				<div className="mt-3 flex flex-wrap gap-1.5">
					{categoryCounts(entry).map(({ category, count }) => (
						<Chip key={category} color={CATEGORY_META[category].color}>
							{categoryLabel(category, count)}
						</Chip>
					))}
				</div>
			</Link>
		</li>
	);
}
