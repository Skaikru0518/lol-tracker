import { storedPlatform, type Platform } from "@/lib/game/platforms";
import { fetchAndStoreMatch } from "@/lib/match/store";
import { getMatchIdsByPuuid } from "@/lib/riot/matches";
import { RiotApiError } from "@/lib/riot/riot";
import { getLiveGame } from "@/lib/riot/spectator";
import { prisma } from "@/lib/server/db";
import { resolveTopMasteries } from "@/lib/summoner/champions/mastery";
import { resolveAccount } from "@/lib/summoner/profile/account";
import { recordPlatform } from "@/lib/summoner/profile/locate-summoner";
import { resolveRankedEntries } from "@/lib/summoner/profile/ranked";
import { type LiveGameParticipant } from "@/lib/validators/live-game";
import { type Match } from "@/lib/validators/match";
import { type OverlayGame, type OverlayPlayer, type OverlayQuery, type OverlayResponse, type OverlaySection } from "@/lib/validators/overlay";
import { allocateMatchFetches, mainRole, overlayRank, overlayTags, splitRiotId, todayRecord } from "./cards";
import { storedPositionCounts } from "./role-query";

const CACHE_TTL_MS = 60_000;
const MATCH_FETCH_CAP = 30;
const TODAY_ID_COUNT = 20;

const cache = new Map<string, { value: OverlayGame; expires: number }>();

export function clearOverlayCache(): void {
	cache.clear();
}

function isRateLimit(error: unknown): boolean {
	return error instanceof RiotApiError && error.status === 429;
}

async function section<T>(draft: OverlayPlayer, name: OverlaySection, onLimit: () => void, fn: () => Promise<T>): Promise<T | null> {
	try {
		return await fn();
	} catch (error) {
		if (!(error instanceof RiotApiError)) throw error;
		if (isRateLimit(error)) onLimit();
		draft.unavailable.push(name);
		return null;
	}
}

async function trackAccount(participant: LiveGameParticipant, platform: Platform): Promise<void> {
	const { puuid } = participant;
	const { gameName, tagLine } = splitRiotId(participant.riotId);
	const existing = await prisma.account.findUnique({ where: { puuid }, select: { platform: true } });
	await prisma.account.upsert({ where: { puuid }, update: { gameName, tagLine }, create: { puuid, gameName, tagLine, platform } });
	const stored = storedPlatform(existing?.platform);
	if (existing && stored !== platform) await recordPlatform(puuid, stored, platform);
}

function isReal(participant: LiveGameParticipant): boolean {
	return Boolean(participant.riotId && participant.puuid);
}

function emptyCard(participant: LiveGameParticipant, selfPuuid: string): OverlayPlayer {
	return {
		...splitRiotId(participant.riotId),
		puuid: participant.puuid,
		teamId: participant.teamId,
		championId: participant.championId,
		isSelf: participant.puuid === selfPuuid,
		role: null,
		rank: null,
		mains: [],
		today: null,
		tags: [],
		unavailable: isReal(participant) ? [] : ["rank", "mains", "today"],
	};
}

export async function buildOverlayGame(query: OverlayQuery, now: number = Date.now()): Promise<OverlayResponse> {
	const self = await resolveAccount(query.gameName, query.tagLine);

	const hit = cache.get(self.puuid);
	if (hit && hit.expires > now) {
		return { ...hit.value, players: hit.value.players.map((p) => ({ ...p, isSelf: p.puuid === self.puuid })) };
	}

	let live;
	try {
		live = await getLiveGame(query.platform, self.puuid);
	} catch (error) {
		if (error instanceof RiotApiError && error.status === 404) return { inGame: false };
		throw error;
	}

	const queueId = live.gameQueueConfigId;
	let limited = false;
	const onLimit = () => {
		limited = true;
	};

	const drafts = live.participants.map((p) => emptyCard(p, self.puuid));
	const todayIds: (string[] | null)[] = drafts.map(() => null);

	await Promise.all(
		live.participants.map(async (participant, i) => {
			const draft = drafts[i];
			if (!isReal(participant)) return;
			await trackAccount(participant, query.platform);

			const [entries, masteries, achievements, positions, ids] = await Promise.all([
				section(draft, "rank", onLimit, () => resolveRankedEntries(participant.puuid)),
				section(draft, "mains", onLimit, () => resolveTopMasteries(participant.puuid, 3)),
				prisma.playerAchievement.findMany({ where: { puuid: participant.puuid } }),
				storedPositionCounts(participant.puuid),
				queueId > 0
					? section(draft, "today", onLimit, () =>
							getMatchIdsByPuuid(participant.puuid, TODAY_ID_COUNT, 0, { startTime: Math.floor(query.since / 1000), queue: queueId }),
						)
					: Promise.resolve(null),
			]);

			if (entries) draft.rank = overlayRank(entries, queueId);
			if (masteries) draft.mains = masteries.slice(0, 3).map((m) => m.championId);
			draft.tags = overlayTags(achievements.map((a) => a.achievementId));
			draft.role = mainRole(positions);
			todayIds[i] = ids;
		}),
	);

	const allIds = [...new Set(todayIds.flatMap((ids) => ids ?? []))];
	const rows = allIds.length ? await prisma.match.findMany({ where: { matchId: { in: allIds } }, select: { matchId: true, data: true } }) : [];
	const matches = new Map(rows.map((row) => [row.matchId, row.data as unknown as Match]));

	const missing = todayIds.map((ids) => (ids ?? []).filter((id) => !matches.has(id)));
	const { fetch, partial } = allocateMatchFetches(missing, MATCH_FETCH_CAP);
	for (const id of fetch) {
		if (limited) break;
		try {
			matches.set(id, await fetchAndStoreMatch(id));
		} catch (error) {
			if (!(error instanceof RiotApiError)) throw error;
			if (isRateLimit(error)) limited = true;
		}
	}

	drafts.forEach((draft, i) => {
		const ids = todayIds[i];
		if (!ids) return;
		const lacking = missing[i].some((id) => fetch.includes(id) && !matches.has(id));
		if (lacking) {
			draft.unavailable.push("today");
			return;
		}
		const owned = ids.flatMap((id) => matches.get(id) ?? []);
		draft.today = { ...todayRecord(owned, draft.puuid, query.since, queueId), partial: partial[i] };
	});

	const value: OverlayGame = {
		inGame: true,
		gameId: live.gameId,
		queueId,
		platform: query.platform,
		gameStartTime: live.gameStartTime,
		players: drafts,
	};
	live.participants.forEach((p) => {
		if (isReal(p)) cache.set(p.puuid, { value, expires: now + CACHE_TTL_MS });
	});
	return value;
}
