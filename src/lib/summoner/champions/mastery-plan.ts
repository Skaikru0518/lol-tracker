const MAX_AGE_MS = 30 * 60 * 1000;

/** How to serve every champion's mastery: from Riot until the full list was synced once, then from the DB, refreshing it in the background after 30 minutes. */
export function allMasteryPlan(syncedAt: Date | null, now: Date): "riot" | "cached" | "cached-revalidate" {
	if (!syncedAt) return "riot";
	return now.getTime() - syncedAt.getTime() < MAX_AGE_MS ? "cached" : "cached-revalidate";
}
