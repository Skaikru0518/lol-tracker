import { prisma } from "@/lib/server/db";
import { type AchievementPayload } from "@/lib/validators/achievements";
import { loadRarity } from "./progress/rarity";

/** Current form, milestone and seasonal rows plus rarity for one account. */
export async function loadAchievementPayload(puuid: string): Promise<AchievementPayload> {
	const [form, progress, rarity] = await Promise.all([
		prisma.playerAchievement.findMany({ where: { puuid }, select: { achievementId: true, earnedAt: true } }),
		prisma.achievementProgress.findMany({ where: { puuid }, select: { achievementId: true, scope: true, value: true, tier: true, reachedAt: true } }),
		loadRarity(),
	]);
	return {
		form: form.map((f) => ({ achievementId: f.achievementId, earnedAt: f.earnedAt.toISOString() })),
		progress: progress.map((p) => ({ ...p, reachedAt: p.reachedAt.map((d) => d.toISOString()) })),
		rarity,
	};
}
