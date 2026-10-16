import { prisma } from "@/lib/server/db";
import { ACHIEVEMENT_QUEUE_IDS, MIN_ACHIEVEMENT_GAME_SECONDS } from "@/lib/achievements/eligibility";
import { currentSeason } from "@/lib/achievements/seasons";
import { RANKED_QUEUE_TYPES, rankedQueueForQueueId, type RankedQueueType } from "@/lib/game/ranked-queues";
import { type LPSnapshot } from "@/lib/validators/lp-history";
import { type MmrEstimates } from "@/lib/validators/mmr";
import { cachedApexCutoffs } from "./apex-cutoffs-store";
import { toAbsoluteLp } from "./lp-change";
import { exactLpChanges } from "./lp-estimate";
import { estimateMmr, pickLpChanges } from "./mmr-estimate";

const RECENT_GAMES = 50;
const LP_GAMES = 20;
const SNAPSHOTS = 200;

interface GameRow {
	matchId: string;
	queueId: number;
	end: bigint;
	win: boolean | null;
	participants: string[];
}

export async function mmrEstimates(puuid: string): Promise<MmrEstimates> {
	// Stored entries also hold non-SR queues (e.g. Arena), which have no MMR here
	const entries = await prisma.rankedEntry.findMany({ where: { puuid, queueType: { in: [...RANKED_QUEUE_TYPES] } } });
	if (entries.length === 0) return { estimates: [] };

	const rows = await prisma.$queryRaw<GameRow[]>`
		SELECT m."matchId", m."queueId", (m."gameCreation" + m."gameDuration" * 1000)::bigint AS "end",
			(SELECT (x->>'win')::boolean FROM jsonb_array_elements(m.data->'info'->'participants') x WHERE x->>'puuid' = ${puuid}) AS win,
			m.data->'metadata'->'participants' AS participants
		FROM (
			SELECT "matchId", "queueId", "gameCreation", "gameDuration", data,
				ROW_NUMBER() OVER (PARTITION BY "queueId" ORDER BY "gameCreation" DESC) AS n
			FROM "Match"
			WHERE data->'metadata'->'participants' @> ${JSON.stringify(puuid)}::jsonb
				AND "queueId" = ANY(${ACHIEVEMENT_QUEUE_IDS}::int[])
				AND "gameDuration" >= ${MIN_ACHIEVEMENT_GAME_SECONDS}
				AND "gameCreation" >= ${BigInt(Date.parse(currentSeason().start))}
		) m
		WHERE m.n <= ${RECENT_GAMES}
	`;

	const others = [...new Set(rows.flatMap((r) => r.participants).filter((p) => p !== puuid))];
	const known = await prisma.rankedEntry.findMany({
		where: { puuid: { in: others } },
		select: { puuid: true, queueType: true, tier: true, rank: true, leaguePoints: true },
	});
	const knownLp = new Map(known.map((k) => [`${k.puuid}:${k.queueType}`, toAbsoluteLp(k.tier, k.rank, k.leaguePoints)]));
	const cutoffs = await cachedApexCutoffs();

	const estimates = await Promise.all(
		entries.map(async (entry) => {
			const queueType = entry.queueType as RankedQueueType;
			const games = rows.filter((r) => rankedQueueForQueueId(r.queueId) === queueType && r.win !== null).sort((a, b) => Number(b.end - a.end));
			const snapshots: LPSnapshot[] = (
				await prisma.lPHistory.findMany({ where: { puuid, queueType }, orderBy: { createdAt: "desc" }, take: SNAPSHOTS })
			)
				.reverse()
				.map((h) => ({ id: h.id, tier: h.tier, rank: h.rank, lp: h.lp, wins: h.wins, losses: h.losses, createdAt: h.createdAt.toISOString() }));
			const changes = exactLpChanges(snapshots, games.map((g) => ({ id: g.matchId, end: Number(g.end), win: g.win! })));
			return estimateMmr({
				queueType,
				current: { tier: entry.tier, rank: entry.rank, lp: entry.leaguePoints },
				lpChanges: pickLpChanges(games.map((g) => ({ id: g.matchId, win: g.win! })), changes, LP_GAMES),
				lobbies: games.map((g) => g.participants.flatMap((p) => (p !== puuid && knownLp.has(`${p}:${queueType}`) ? [knownLp.get(`${p}:${queueType}`)!] : []))),
				cutoff: cutoffs[queueType],
			});
		}),
	);
	return { estimates: estimates.filter((e) => e !== null) };
}
