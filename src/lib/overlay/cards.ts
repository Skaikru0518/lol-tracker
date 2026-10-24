import { isRemake } from "@/lib/match/remake";
import { type Match } from "@/lib/validators/match";
import { overlayRoleSchema, type OverlayPlayer, type OverlayRole, type OverlayTag } from "@/lib/validators/overlay";
import { type RankedEntry } from "@/lib/validators/ranked";

const FLEX_QUEUE_ID = 440;

const TAGS: Record<string, OverlayTag> = { "win-streak": "on-fire", "one-trick": "one-trick" };
const ROLE_MIN_GAMES = 3;
const ROLE_MIN_SHARE = 0.4;

export function splitRiotId(riotId: string): { gameName: string; tagLine: string } {
	const separator = riotId.lastIndexOf("#");
	if (separator === -1) return { gameName: riotId, tagLine: "" };
	return { gameName: riotId.slice(0, separator), tagLine: riotId.slice(separator + 1) };
}

export function overlayRank(entries: RankedEntry[], queueId: number): OverlayPlayer["rank"] {
	const queueType = queueId === FLEX_QUEUE_ID ? "RANKED_FLEX_SR" : "RANKED_SOLO_5x5";
	const entry = entries.find((e) => e.queueType === queueType);
	if (!entry) return null;
	return { queueType, tier: entry.tier, division: entry.rank, leaguePoints: entry.leaguePoints, wins: entry.wins, losses: entry.losses };
}

export function todayRecord(matches: Match[], puuid: string, sinceMs: number, queueId: number): { wins: number; losses: number } {
	let wins = 0;
	let losses = 0;
	for (const { info } of matches) {
		if (info.queueId !== queueId || info.gameCreation < sinceMs || isRemake(info.gameDuration)) continue;
		const participant = info.participants.find((p) => p.puuid === puuid);
		if (!participant) continue;
		if (participant.win) wins++;
		else losses++;
	}
	return { wins, losses };
}

// Teammates share today's games, so ids are de-duplicated before the cap is spent round-robin
export function allocateMatchFetches(missing: string[][], cap: number): { fetch: string[]; partial: boolean[] } {
	const chosen = new Set<string>();
	const longest = Math.max(0, ...missing.map((ids) => ids.length));
	for (let round = 0; round < longest && chosen.size < cap; round++) {
		for (const ids of missing) {
			if (chosen.size >= cap) break;
			const id = ids[round];
			if (id !== undefined) chosen.add(id);
		}
	}
	return { fetch: [...chosen], partial: missing.map((ids) => ids.some((id) => !chosen.has(id))) };
}

export function overlayTags(achievementIds: string[]): OverlayTag[] {
	return achievementIds.flatMap((id) => (TAGS[id] ? [TAGS[id]] : []));
}

export function mainRole(counts: { position: string; games: number }[]): OverlayRole | null {
	const known = counts.flatMap(({ position, games }) => {
		const role = overlayRoleSchema.safeParse(position);
		return role.success ? [{ role: role.data, games }] : [];
	});
	const total = known.reduce((sum, c) => sum + c.games, 0);
	const top = known.reduce<{ role: OverlayRole; games: number } | null>((best, c) => (!best || c.games > best.games ? c : best), null);
	if (!top || top.games < ROLE_MIN_GAMES || top.games / total < ROLE_MIN_SHARE) return null;
	return top.role;
}
