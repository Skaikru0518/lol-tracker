import { prisma } from "@/lib/server/db";
import { detectAchievements } from "./profile/detect";
import { loadAchievementMatches } from "./profile/query";
import { recomputeProgress } from "./progress/save";

/** Awards the achievements one account earns now, removes the ones it lost, and recomputes its progress; returns how many were newly awarded. */
export async function refreshAchievements(puuid: string): Promise<number> {
	const earnedIds = detectAchievements({ matches: await loadAchievementMatches(puuid), puuid });
	const inserted = earnedIds.length
		? await prisma.playerAchievement.createMany({ data: earnedIds.map((achievementId) => ({ puuid, achievementId })), skipDuplicates: true })
		: { count: 0 };
	await prisma.playerAchievement.deleteMany({ where: { puuid, achievementId: { notIn: earnedIds } } });
	await recomputeProgress(puuid);
	return inserted.count;
}
