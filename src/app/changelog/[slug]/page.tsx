import { notFound } from "next/navigation";
import { ChangelogDetail } from "@/components/changelog/page/changelog-detail";
import { changelogs, getChangelog } from "@/components/changelog/registry";

export function generateStaticParams() {
	return changelogs.map((c) => ({ slug: c.slug }));
}

/** One changelog entry; unknown slugs are a 404. */
export default async function ChangelogSlugPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const entry = getChangelog(slug);
	if (!entry) notFound();

	return (
		<div className="mx-auto max-w-3xl px-4 py-10">
			<ChangelogDetail entry={entry} />
		</div>
	);
}
