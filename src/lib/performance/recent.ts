import { prisma } from "@/lib/server/db";
import { ACHIEVEMENT_QUEUE_IDS, MIN_ACHIEVEMENT_GAME_SECONDS } from "@/lib/achievements/eligibility";
import { scoreAndCache } from "./batch";
import { summarizeRecent, type RecentGame, type RecentSummary } from "./recent-summary";
import { type PerformanceScore } from "./score";

const RECENT_GAMES = 30;

interface LobbyPlayer {
	puuid: string;
	teamId: number;
	win: boolean;
	championName: string;
	kills: number;
	deaths: number;
	assists: number;
}

export async function recentPerformance(puuid: string): Promise<RecentSummary> {
	const rows = await prisma.$queryRaw<{ matchId: string; players: LobbyPlayer[] }[]>`
		SELECT
			m."matchId",
			(
				SELECT jsonb_agg(jsonb_build_object(
					'puuid', x->'puuid',
					'teamId', x->'teamId',
					'win', x->'win',
					'championName', x->'championName',
					'kills', x->'kills',
					'deaths', x->'deaths',
					'assists', x->'assists'
				))
				FROM jsonb_array_elements(m.data->'info'->'participants') AS x
			) AS players
		FROM "Match" m
		WHERE m.data->'metadata'->'participants' @> ${JSON.stringify(puuid)}::jsonb
			AND m."queueId" = ANY(${ACHIEVEMENT_QUEUE_IDS}::int[])
			AND m."gameDuration" >= ${MIN_ACHIEVEMENT_GAME_SECONDS}
		ORDER BY m."gameCreation" DESC
		LIMIT ${RECENT_GAMES}
	`;
	const ids = rows.map((r) => r.matchId);

	const scores: Record<string, Record<string, PerformanceScore>> = {};
	const cached = await prisma.matchPerformance.findMany({ where: { matchId: { in: ids } }, select: { matchId: true, data: true } });
	for (const row of cached) scores[row.matchId] = row.data as unknown as Record<string, PerformanceScore>;
	Object.assign(scores, await scoreAndCache(ids.filter((id) => !scores[id])));

	const games: RecentGame[] = rows.flatMap(({ matchId, players }) => {
		const player = players.find((p) => p.puuid === puuid);
		if (!player) return [];
		const matchScores = scores[matchId] ?? {};
		return [
			{
				championName: player.championName,
				win: player.win,
				kills: player.kills,
				deaths: player.deaths,
				assists: player.assists,
				teamId: player.teamId,
				score: matchScores[puuid] ?? null,
				lobby: players.flatMap((p) => (matchScores[p.puuid] ? [{ puuid: p.puuid, teamId: p.teamId, win: p.win, score: matchScores[p.puuid].score }] : [])),
			},
		];
	});
	return summarizeRecent(puuid, games);
}
