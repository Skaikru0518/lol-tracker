import { prisma } from "@/lib/server/db";
import { getAppSetting, setAppSetting } from "@/lib/server/app-settings";
import { rarityStoreSchema, type Rarity } from "@/lib/validators/achievements";
import { currentSeason } from "../seasons";
import { ALL_TIME_SCOPE } from "./types";

export const RARITY_SETTING_KEY = "achievement-rarity";

/** Share of `players` at or above each tier, per `${id}:${scope}`. */
export function computeRarityShares(rows: { achievementId: string; scope: string; tier: number; count: number }[], players: number): Record<string, number[]> {
	if (players === 0) return {};
	const shares: Record<string, number[]> = {};
	for (const row of rows) {
		if (row.tier === 0) continue;
		const list = (shares[`${row.achievementId}:${row.scope}`] ??= []);
		for (let t = 0; t < row.tier; t++) list[t] = (list[t] ?? 0) + row.count / players;
	}
	for (const list of Object.values(shares)) for (let t = 0; t < list.length; t++) list[t] = Math.round((list[t] ?? 0) * 1000) / 1000;
	return shares;
}

/** Counts every computed account (each has a Veteran row) and stores the shares for all-time and the current season. */
export async function saveRarity(now: Date = new Date()): Promise<void> {
	const scopes = [ALL_TIME_SCOPE, currentSeason(now).id];
	const [players, groups] = await Promise.all([
		prisma.achievementProgress.count({ where: { achievementId: "veteran", scope: ALL_TIME_SCOPE } }),
		prisma.achievementProgress.groupBy({ by: ["achievementId", "scope", "tier"], where: { scope: { in: scopes } }, _count: { _all: true } }),
	]);
	const rows = groups.map((g) => ({ achievementId: g.achievementId, scope: g.scope, tier: g.tier, count: g._count._all }));
	await setAppSetting(RARITY_SETTING_KEY, JSON.stringify({ computedAt: now.toISOString(), players, shares: computeRarityShares(rows, players) }));
}

/** Stored rarity, or null before the first cron run or when the stored JSON is unreadable. */
export async function loadRarity(): Promise<Rarity | null> {
	const raw = await getAppSetting(RARITY_SETTING_KEY);
	if (!raw) return null;
	try {
		const { players, shares } = rarityStoreSchema.parse(JSON.parse(raw));
		return { players, shares };
	} catch {
		return null;
	}
}
