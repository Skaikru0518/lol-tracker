import { dayKeyIn } from "@/lib/lp-history/summary";
import { performanceSummaries } from "@/lib/performance/batch";
import { prisma } from "@/lib/server/db";
import { buildPromoCard, type PromoCard } from "./promo-card";

const QUEUE_ID: Record<string, number> = { RANKED_SOLO_5x5: 420, RANKED_FLEX_SR: 440 };
const DAY_MS = 24 * 60 * 60 * 1000;

/** The promotion card from the database, with the player's Riot ID for links and titles. */
export async function loadPromoCard(snapshotId: string): Promise<{ card: PromoCard; gameName: string; tagLine: string } | null> {
	const snapshot = await prisma.lPHistory.findUnique({ where: { id: snapshotId }, select: { puuid: true, queueType: true } });
	if (!snapshot) return null;
	const { puuid, queueType } = snapshot;
	const [rows, account] = await Promise.all([
		prisma.lPHistory.findMany({ where: { puuid, queueType }, orderBy: { createdAt: "asc" } }),
		prisma.account.findUnique({ where: { puuid }, select: { gameName: true, tagLine: true } }),
	]);
	if (!account?.gameName) return null;

	const snapshots = rows.map((r) => ({ id: r.id, tier: r.tier, rank: r.rank, lp: r.lp, wins: r.wins, losses: r.losses, createdAt: r.createdAt.toISOString() }));
	const riotId = `${account.gameName}#${account.tagLine}`;
	const card = buildPromoCard(snapshots, snapshotId, riotId, queueType, null);
	if (!card) return null;
	return { card: { ...card, avgScore: await dayAverageScore(puuid, queueType, card.day, rows.find((r) => r.id === snapshotId)!.createdAt) }, ...account };
}

// Shown only when every game of that day in the queue has a score, so the number is never a partial average
async function dayAverageScore(puuid: string, queueType: string, day: string, promotedAt: Date): Promise<number | null> {
	const queueId = QUEUE_ID[queueType];
	if (!queueId) return null;
	const around = promotedAt.getTime();
	const games = await prisma.$queryRaw<{ matchId: string; gameCreation: bigint }[]>`
		SELECT "matchId", "gameCreation" FROM "Match"
		WHERE data->'metadata'->'participants' @> ${JSON.stringify(puuid)}::jsonb
			AND "queueId" = ${queueId}
			AND "gameCreation" BETWEEN ${BigInt(around - DAY_MS)} AND ${BigInt(around + DAY_MS)}
	`;
	const ids = games.filter((g) => dayKeyIn(new Date(Number(g.gameCreation)).toISOString(), "Europe/Budapest") === day).map((g) => g.matchId);
	if (ids.length === 0) return null;
	const scores = Object.values(await performanceSummaries(ids, puuid));
	if (scores.some((s) => s === null)) return null;
	return Math.round(scores.reduce((sum, s) => sum + s!.score, 0) / scores.length);
}
