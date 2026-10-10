import { type ChangelogEntry } from "@/components/changelog/changelog-type";

export type ChangeCategory = ChangelogEntry["changes"][number]["category"];

const ORDER: ChangeCategory[] = ["feature", "improvement", "design", "fix"];

/** Label, plural heading and chip hex (chart palette) for each change category. */
export const CATEGORY_META: Record<ChangeCategory, { label: string; plural: string; color: string }> = {
	feature: { label: "Feature", plural: "Features", color: "#b05ad6" },
	improvement: { label: "Improvement", plural: "Improvements", color: "#34c38f" },
	design: { label: "Design", plural: "Design", color: "#4f8fe6" },
	fix: { label: "Fix", plural: "Fixes", color: "#e9b949" },
};

/** Categories present in an entry with their change counts, in a fixed order. */
export function categoryCounts(entry: ChangelogEntry): { category: ChangeCategory; count: number }[] {
	return ORDER.map((category) => ({ category, count: entry.changes.filter((c) => c.category === category).length })).filter((c) => c.count > 0);
}

/** An entry's changes grouped by category, same order as `categoryCounts`. */
export function groupChanges(entry: ChangelogEntry): { category: ChangeCategory; items: ChangelogEntry["changes"] }[] {
	return ORDER.map((category) => ({ category, items: entry.changes.filter((c) => c.category === category) })).filter((g) => g.items.length > 0);
}
