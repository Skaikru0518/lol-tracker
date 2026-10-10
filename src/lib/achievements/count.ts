/** Saved achievements that still exist in the definitions (renamed or removed ones are not counted). */
export function earnedCount(saved: { achievementId: string }[] | undefined, definitions: { id: string }[]): number {
	const known = new Set(definitions.map((d) => d.id));
	return new Set((saved ?? []).map((s) => s.achievementId).filter((id) => known.has(id))).size;
}
