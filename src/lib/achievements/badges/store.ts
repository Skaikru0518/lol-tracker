import { prisma } from "@/lib/server/db";
import { matchSchema } from "@/lib/validators/match";
import { ACHIEVEMENT_QUEUE_IDS, MIN_ACHIEVEMENT_GAME_SECONDS } from "../eligibility";
import { detectMatchBadges } from "./detect";

type StoredBadge = { puuid: string; badgeId: string };

/** Badges per match from the database, detecting and storing them for matches not done yet; only ranked games earn badges. */
export async function badgesForMatches(matchIds: string[]): Promise<Record<string, StoredBadge[]>> {
	const result: Record<string, StoredBadge[]> = Object.fromEntries(matchIds.map((id) => [id, []]));

	// Only ranked games earn badges, so rows left from other queues are never served
	const eligible = await prisma.match.findMany({
		where: { matchId: { in: matchIds }, queueId: { in: ACHIEVEMENT_QUEUE_IDS }, gameDuration: { gte: MIN_ACHIEVEMENT_GAME_SECONDS } },
		select: { matchId: true },
	});
	const eligibleIds = eligible.map((m) => m.matchId);
	if (eligibleIds.length === 0) return result;

	const existing = await prisma.matchBadge.findMany({ where: { matchId: { in: eligibleIds } }, select: { matchId: true, puuid: true, badgeId: true } });
	const computed = new Set<string>();
	for (const badge of existing) {
		result[badge.matchId].push({ puuid: badge.puuid, badgeId: badge.badgeId });
		computed.add(badge.matchId);
	}

	const missingIds = eligibleIds.filter((id) => !computed.has(id));
	if (missingIds.length === 0) return result;

	const fresh: { matchId: string; puuid: string; badgeId: string }[] = [];
	for (const match of await prisma.match.findMany({ where: { matchId: { in: missingIds } } })) {
		try {
			const badges = detectMatchBadges(matchSchema.parse(match.data).info);
			result[match.matchId] = badges;
			fresh.push(...badges.map((b) => ({ matchId: match.matchId, puuid: b.puuid, badgeId: b.badgeId })));
		} catch (error) {
			console.error(`[badges] detection failed for ${match.matchId}:`, error);
		}
	}
	if (fresh.length > 0) await prisma.matchBadge.createMany({ data: fresh, skipDuplicates: true });
	return result;
}
