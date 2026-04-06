import { type ChangelogEntry } from "./changelog-type";

import changelog_2026_04_07 from "./changes/2026-04-07/metadata";
import changelog_2026_04_03 from "./changes/2026-04-03/metadata";
import changelog_2026_04_02 from "./changes/2026-04-02/metadata";
import changelog_2026_03_24 from "./changes/2026-03-24/metadata";
import changelog_2026_03_23 from "./changes/2026-03-23/metadata";
import changelog_2026_03_22 from "./changes/2026-03-22/metadata";

// Newest first
export const changelogs: ChangelogEntry[] = [
	changelog_2026_04_07,
	changelog_2026_04_03,
	changelog_2026_04_02,
	changelog_2026_03_24,
	changelog_2026_03_23,
	changelog_2026_03_22,
];

export function getChangelog(slug: string): ChangelogEntry | undefined {
	return changelogs.find((c) => c.slug === slug);
}
