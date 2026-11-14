import { badgesForMatches } from "@/lib/achievements/badges/store";
import { rankedQueueForQueueId } from "@/lib/game/ranked-queues";
import { isRemake } from "@/lib/match/remake";
import { performanceForMatch } from "@/lib/performance/batch";
import { prisma } from "@/lib/server/db";
import { type Match } from "@/lib/validators/match";
import { buildMatchCard, pickRankAtMatch, type MatchCard } from "./match-card";

/** Everything the match card needs, from the database only (scores and badges are computed from the stored match when missing). */
export async function loadMatchCard(matchId: string, puuid: string): Promise<{ card: MatchCard; match: Match; complete: boolean } | null> {
	const row = await prisma.match.findUnique({ where: { matchId }, select: { data: true } });
	if (!row) return null;
	const match = row.data as unknown as Match;
	if (!match.info.participants.some((p) => p.puuid === puuid)) return null;

	const queueType = rankedQueueForQueueId(match.info.queueId);
	const gameEnd = match.info.gameCreation + match.info.gameDuration * 1000;
	const [scores, badges, snapshots] = await Promise.all([
		performanceForMatch(matchId),
		badgesForMatches([matchId]),
		queueType
			? prisma.lPHistory.findMany({ where: { puuid, queueType, createdAt: { gte: new Date(gameEnd) } }, orderBy: { createdAt: "asc" }, take: 5 })
			: Promise.resolve([]),
	]);

	const score = scores[puuid] ?? null;
	const card = buildMatchCard(
		match,
		puuid,
		score,
		badges[matchId].filter((b) => b.puuid === puuid).map((b) => b.badgeId),
		pickRankAtMatch(snapshots, gameEnd),
	);
	if (!card) return null;
	const scoreable = queueType !== null && !isRemake(match.info.gameDuration);
	return { card, match, complete: card.score !== null || !scoreable };
}
