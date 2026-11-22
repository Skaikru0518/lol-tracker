import { prisma } from "@/lib/server/db";
import { detectAchievements } from "./profile/detect";
import { withRoleWinRate } from "./profile/form-id";
import { seasonOneTrick } from "./profile/one-trick";
import { loadAchievementMatches } from "./profile/query";
import { recomputeProgress } from "./progress/save";

/** Awards the achievements one account earns now, removes the ones it lost, and recomputes its progress; returns how many were newly awarded. */
export async function refreshAchievements(puuid: string): Promise<number> {
	const [season, matches] = await Promise.all([recomputeProgress(puuid), loadAchievementMatches(puuid)]);
	const oneTrick = seasonOneTrick(season.champions);
	const earnedIds = [...detectAchievements({ matches, puuid }).map((id) => withRoleWinRate(id, season.games)), ...(oneTrick ? [oneTrick] : [])];
	const inserted = earnedIds.length
		? await prisma.playerAchievement.createMany({ data: earnedIds.map((achievementId) => ({ puuid, achievementId })), skipDuplicates: true })
		: { count: 0 };
	await prisma.playerAchievement.deleteMany({ where: { puuid, achievementId: { notIn: earnedIds } } });
	return inserted.count;
}
