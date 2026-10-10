import { type ChangelogEntry } from "@/components/changelog/changelog-type";

export type ChangeCategory = ChangelogEntry["changes"][number]["category"];

const ORDER: ChangeCategory[] = ["feature", "improvement", "design", "fix"];

/** Label, plural heading and chip color (chart palette tokens) for each change category. */
export const CATEGORY_META: Record<ChangeCategory, { label: string; plural: string; color: string }> = {
	feature: { label: "Feature", plural: "Features", color: "var(--chart-1)" },
	improvement: { label: "Improvement", plural: "Improvements", color: "var(--chart-3)" },
	design: { label: "Design", plural: "Design", color: "var(--chart-2)" },
	fix: { label: "Fix", plural: "Fixes", color: "var(--chart-4)" },
};

/** Categories present in an entry with their change counts, in a fixed order. */
export function categoryCounts(entry: ChangelogEntry): { category: ChangeCategory; count: number }[] {
	return ORDER.map((category) => ({ category, count: entry.changes.filter((c) => c.category === category).length })).filter((c) => c.count > 0);
}

/** An entry's changes grouped by category, same order as `categoryCounts`. */
export function groupChanges(entry: ChangelogEntry): { category: ChangeCategory; items: ChangelogEntry["changes"] }[] {
	return ORDER.map((category) => ({ category, items: entry.changes.filter((c) => c.category === category) })).filter((g) => g.items.length > 0);
}

/** An entry's `YYYY-MM-DD` date in UTC, so the day never shifts with the server's time zone. */
export function formatEntryDate(iso: string, style: "long" | "short"): string {
	return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: style, day: "numeric", timeZone: "UTC" });
}

/** Count chip text such as `1 fix` or `3 features`. */
export function categoryLabel(category: ChangeCategory, count: number): string {
	const meta = CATEGORY_META[category];
	return `${count} ${(count === 1 ? meta.label : meta.plural).toLowerCase()}`;
}
