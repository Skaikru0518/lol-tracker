import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/db";
import { ACHIEVEMENT_QUEUE_IDS, MIN_ACHIEVEMENT_GAME_SECONDS } from "@/lib/achievements/eligibility";
import { latestBaselines } from "./baselines";
import { type ScoringParticipant } from "./metrics";
import { scoreMatch, summarize, type PerformanceScore, type ScoreSummary, type ScoringMatch } from "./score";

type MatchScores = Record<string, PerformanceScore>;

// Only the participant fields scoring reads, built in SQL so full match documents never leave the database
export async function loadScoringMatches(matchIds: string[]): Promise<(ScoringMatch & { matchId: string })[]> {
	const rows = await prisma.$queryRaw<{ matchId: string; queueId: number; gameDuration: number; participants: ScoringParticipant[] }[]>`
		SELECT
			m."matchId",
			m."queueId",
			m."gameDuration",
			(
				SELECT jsonb_agg(jsonb_build_object(
					'puuid', x->'puuid',
					'teamId', x->'teamId',
					'teamPosition', x->'teamPosition',
					'championName', x->'championName',
					'kills', x->'kills',
					'deaths', x->'deaths',
					'assists', x->'assists',
					'totalMinionsKilled', x->'totalMinionsKilled',
					'neutralMinionsKilled', x->'neutralMinionsKilled',
					'goldEarned', x->'goldEarned',
					'totalDamageDealtToChampions', x->'totalDamageDealtToChampions',
					'totalDamageTaken', x->'totalDamageTaken',
					'visionScore', x->'visionScore',
					'wardsPlaced', x->'wardsPlaced',
					'wardsKilled', x->'wardsKilled',
					'visionWardsBoughtInGame', x->'visionWardsBoughtInGame',
					'turretKills', x->'turretKills',
					'inhibitorKills', x->'inhibitorKills',
					'dragonKills', x->'dragonKills',
					'baronKills', x->'baronKills',
					'champExperience', x->'champExperience',
					'damageDealtToObjectives', x->'damageDealtToObjectives',
					'objectivesStolen', x->'objectivesStolen'
				))
				FROM jsonb_array_elements(m.data->'info'->'participants') AS x
			) AS participants
		FROM "Match" m
		WHERE m."matchId" = ANY(${matchIds}::text[])
			AND m."queueId" = ANY(${ACHIEVEMENT_QUEUE_IDS}::int[])
			AND m."gameDuration" >= ${MIN_ACHIEVEMENT_GAME_SECONDS}
	`;
	// jsonb_build_object keeps JSON nulls for fields older rows lack; scoring expects them absent
	return rows.map((r) => ({
		matchId: r.matchId,
		info: {
			queueId: r.queueId,
			gameDuration: r.gameDuration,
			participants: (r.participants ?? []).map((p) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== null)) as ScoringParticipant),
		},
	}));
}

export async function scoreAndCache(matchIds: string[]): Promise<Record<string, MatchScores>> {
	const result: Record<string, MatchScores> = {};
	const stored = matchIds.length > 0 ? await latestBaselines() : null;
	if (!stored) return result;

	const toCache: Prisma.MatchPerformanceCreateManyInput[] = [];
	for (const match of await loadScoringMatches(matchIds)) {
		const { scores, cacheable } = scoreMatch(match, stored.baselines);
		result[match.matchId] = scores;
		if (cacheable && Object.keys(scores).length > 0) {
			toCache.push({
				matchId: match.matchId,
				baselineId: stored.id,
				data: scores as unknown as Prisma.InputJsonValue,
				summary: summarize(scores) as unknown as Prisma.InputJsonValue,
			});
		}
	}
	if (toCache.length > 0) await prisma.matchPerformance.createMany({ data: toCache, skipDuplicates: true });
	return result;
}

/** The list only needs one player's score and grade, so cached games are read from the small summary column. */
export async function performanceSummaries(matchIds: string[], puuid: string): Promise<Record<string, ScoreSummary | null>> {
	const result: Record<string, ScoreSummary | null> = Object.fromEntries(matchIds.map((id) => [id, null]));
	const cached = await prisma.matchPerformance.findMany({ where: { matchId: { in: matchIds } }, select: { matchId: true, summary: true } });
	for (const row of cached) result[row.matchId] = (row.summary as unknown as Record<string, ScoreSummary>)[puuid] ?? null;

	const cachedIds = new Set(cached.map((c) => c.matchId));
	const fresh = await scoreAndCache(matchIds.filter((id) => !cachedIds.has(id)));
	for (const [matchId, scores] of Object.entries(fresh)) {
		const score = scores[puuid];
		result[matchId] = score ? { score: score.score, grade: score.grade } : null;
	}
	return result;
}

export async function performanceForMatch(matchId: string): Promise<MatchScores> {
	const cached = await prisma.matchPerformance.findUnique({ where: { matchId }, select: { data: true } });
	if (cached) return cached.data as unknown as MatchScores;
	return (await scoreAndCache([matchId]))[matchId] ?? {};
}
