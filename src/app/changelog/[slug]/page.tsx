import { getChangelog, changelogs } from "@/components/changelog/registry";
import ChangelogDetail from "@/components/changelog/page/changelog-detail";
import BackButton from "@/components/ui/back-button";
import { notFound } from "next/navigation";

export function generateStaticParams() {
	return changelogs.map((c) => ({ slug: c.slug }));
}

export default async function ChangelogSlugPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const entry = getChangelog(slug);

	if (!entry) notFound();

	return (
		<div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
			<BackButton />
			<ChangelogDetail entry={entry} />
		</div>
	);
}
