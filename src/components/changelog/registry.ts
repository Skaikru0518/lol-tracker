import { type ChangelogEntry } from "./changelog-type";

import changelog_2026_03_23 from "./changes/2026-03-23/metadata";
import changelog_2026_03_22 from "./changes/2026-03-22/metadata";

// Newest first
export const changelogs: ChangelogEntry[] = [
	changelog_2026_03_23,
	changelog_2026_03_22,
];

export function getChangelog(slug: string): ChangelogEntry | undefined {
	return changelogs.find((c) => c.slug === slug);
}
