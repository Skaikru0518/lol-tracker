import { getChampionMap, getDDragonVersion } from "@/lib/game/icon-helpers";
import { decodeSlug, parseSummonerSlug } from "@/lib/game/riot-id";
import { fetchAndStoreMatch } from "@/lib/match/store";
import { getMatchIdsByPuuid } from "@/lib/riot/matches";
import { getRankedByPuuid } from "@/lib/riot/ranked";
import { RiotApiError } from "@/lib/riot/riot";
import { getLiveGame } from "@/lib/riot/spectator";
import { prisma } from "@/lib/server/db";
import { resolveAccount } from "@/lib/summoner/profile/account";
import { locateSummoner } from "@/lib/summoner/profile/locate-summoner";
import { saveRankedEntries } from "@/lib/summoner/profile/ranked";
import { type Match } from "@/lib/validators/match";
import { type WidgetData, type WidgetQuery } from "@/lib/validators/widget";
import { AUTO_SESSION_GAP_MS, autoSession, sessionGames, sessionLpChange } from "./session";

const MIN = 60_000;
const RANKED_EVERY_MS = MIN;
const IDS_EVERY_MS = 5 * MIN;
const LIVE_EVERY_MS = 2 * MIN;
const IDS_LOOKBACK_MS = 24 * 60 * MIN;
const ID_COUNT = 20;
const SEASON_GAME_COUNT = 10;
const MATCH_FETCH_CAP = 10;

const QUEUES = {
	solo: { queueId: 420, queueType: "RANKED_SOLO_5x5" },
	flex: { queueId: 440, queueType: "RANKED_FLEX_SR" },
} as const;

interface CallState {
	rankedAt: number;
	idsAt: number;
	ids: string[] | null;
	idsTotal: number | null;
	liveAt: number;
	liveChampion: string | null;
	liveStartedAt: number | null;
}

// Per pod, keyed by summoner and queue: every browser showing the same widget shares one call budget
const states = new Map<string, CallState>();

export function clearWidgetState(): void {
	states.clear();
}

function stateFor(key: string): CallState {
	let state = states.get(key);
	if (!state) {
		state = { rankedAt: -Infinity, idsAt: -Infinity, ids: null, idsTotal: null, liveAt: -Infinity, liveChampion: null, liveStartedAt: null };
		states.set(key, state);
	}
	return state;
}

async function findAccount(slug: string) {
	const { gameName, tagLine } = parseSummonerSlug(decodeSlug(slug));
	if (!gameName || !tagLine) return null;
	try {
		const account = await resolveAccount(gameName, tagLine);
		const located = await locateSummoner(account.puuid, null);
		return located ? { account, platform: located.platform } : null;
	} catch (error) {
		if (error instanceof RiotApiError && error.status === 404) return null;
		throw error;
	}
}

export async function buildWidgetData(slug: string, query: WidgetQuery, now: number = Date.now()): Promise<WidgetData | null> {
	const found = await findAccount(slug);
	if (!found) return null;
	const { account, platform } = found;
	const { puuid } = account;
	const { queueId, queueType } = QUEUES[query.queue];
	const season = query.scope === "season";
	const state = stateFor(`${puuid}:${query.queue}:${season ? "season" : "session"}`);

	let limited = false;
	async function riot<T>(fn: () => Promise<T>): Promise<T | null> {
		if (limited) return null;
		try {
			return await fn();
		} catch (error) {
			if (!(error instanceof RiotApiError)) throw error;
			if (error.status === 429) limited = true;
			return null;
		}
	}

	if (now - state.rankedAt >= RANKED_EVERY_MS) {
		state.rankedAt = now;
		const entries = await riot(() => getRankedByPuuid(platform, puuid));
		if (entries) await saveRankedEntries(puuid, entries);
	}
	const entry = await prisma.rankedEntry.findUnique({ where: { puuid_queueType: { puuid, queueType } } });

	const total = entry ? entry.wins + entry.losses : null;
	if (!limited && (state.ids === null || total !== state.idsTotal || now - state.idsAt >= IDS_EVERY_MS)) {
		const ids = await riot(() =>
			season
				? getMatchIdsByPuuid(puuid, SEASON_GAME_COUNT, 0, { queue: queueId })
				: getMatchIdsByPuuid(puuid, ID_COUNT, 0, { startTime: Math.floor((now - IDS_LOOKBACK_MS) / 1000), queue: queueId }),
		);
		if (ids) {
			state.ids = ids;
			state.idsAt = now;
			state.idsTotal = total;
		}
	}

	const ids = state.ids ?? [];
	const rows = ids.length ? await prisma.match.findMany({ where: { matchId: { in: ids } }, select: { matchId: true, data: true } }) : [];
	const matches = new Map(rows.map((row) => [row.matchId, row.data as unknown as Match]));
	for (const id of ids.filter((id) => !matches.has(id)).slice(0, MATCH_FETCH_CAP)) {
		const fetched = await riot(() => fetchAndStoreMatch(id));
		if (fetched) matches.set(id, fetched);
	}

	const all = sessionGames([...matches.values()], puuid, queueId, query.since ?? 0);
	const games = season ? all : query.since === undefined ? autoSession(all, now, AUTO_SESSION_GAP_MS) : all;
	const sessionWins = games.filter((g) => g.win).length;
	const record = season
		? { wins: entry?.wins ?? 0, losses: entry?.losses ?? 0 }
		: { wins: sessionWins, losses: games.length - sessionWins };

	let lpChange: number | null = null;
	if (!season && entry && games.length) {
		const baseline = await prisma.lPHistory.findFirst({
			where: { puuid, queueType, createdAt: { lt: new Date(games[0].start) } },
			orderBy: { createdAt: "desc" },
		});
		lpChange = sessionLpChange(baseline, { tier: entry.tier, rank: entry.rank, lp: entry.leaguePoints, wins: entry.wins, losses: entry.losses }, games);
	}

	if (query.live && !limited && now - state.liveAt >= LIVE_EVERY_MS) {
		state.liveAt = now;
		try {
			const live = await getLiveGame(platform, puuid);
			const championId = live.participants.find((p) => p.puuid === puuid)?.championId;
			const champions = championId ? await getChampionMap(await getDDragonVersion()) : null;
			state.liveChampion = (championId && champions?.[championId]?.id) || null;
			state.liveStartedAt = live.gameStartTime || null;
		} catch (error) {
			if (!(error instanceof RiotApiError)) throw error;
			if (error.status === 404) {
				state.liveChampion = null;
				state.liveStartedAt = null;
			}
		}
	}

	return {
		gameName: account.gameName,
		tagLine: account.tagLine,
		platform,
		rank: entry ? { tier: entry.tier, division: entry.rank, leaguePoints: entry.leaguePoints } : null,
		scope: season ? "season" : "session",
		record,
		season: entry ? { wins: entry.wins, losses: entry.losses } : null,
		games,
		lpChange,
		liveChampion: query.live ? state.liveChampion : null,
		liveStartedAt: query.live ? state.liveStartedAt : null,
	};
}
