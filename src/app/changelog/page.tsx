import { changelogs } from "@/components/changelog/registry";
import ChangelogCard from "@/components/changelog/page/changelog-card";
import BackButton from "@/components/ui/back-button";

export default function ChangelogPage() {
	return (
		<div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
			<BackButton />
			<div className="mb-10">
				<h1 className="text-4xl font-bold tracking-tight">Changelog</h1>
				<p className="mt-2 text-lg text-muted-foreground">
					What&apos;s new in Summon.gg
				</p>
			</div>
			<div>
				{changelogs.map((entry, i) => (
					<ChangelogCard
						key={entry.slug}
						entry={entry}
						index={i}
						isLast={i === changelogs.length - 1}
					/>
				))}
			</div>
		</div>
	);
}
