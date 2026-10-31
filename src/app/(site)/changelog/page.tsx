import { changelogs } from "@/components/changelog/registry";
import { ChangelogTimelineItem } from "@/components/changelog/page/changelog-timeline-item";

/** Changelog list: every entry on a vertical timeline, newest first. */
export default function ChangelogPage() {
	return (
		<div className="mx-auto max-w-3xl px-4 py-10">
			<h1 className="text-3xl font-bold tracking-tight text-foreground">Changelog</h1>
			<p className="mt-1 text-muted-foreground">New features, improvements and fixes in Summon.gg</p>
			<ol className="mt-8">
				{changelogs.map((entry, i) => (
					<ChangelogTimelineItem key={entry.slug} entry={entry} latest={i === 0} />
				))}
			</ol>
		</div>
	);
}
