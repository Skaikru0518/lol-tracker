import { isRemake } from "@/lib/match/remake";
import { toAbsoluteLp } from "@/lib/summoner/profile/lp-change";
import { type Match } from "@/lib/validators/match";
import { type WidgetGame } from "@/lib/validators/widget";

export const AUTO_SESSION_GAP_MS = 3 * 60 * 60 * 1000;

export interface LpPoint {
	tier: string;
	rank: string;
	lp: number;
	wins: number | null;
	losses: number | null;
}

export function sessionGames(matches: Match[], puuid: string, queueId: number, sinceMs: number): WidgetGame[] {
	return matches
		.flatMap(({ metadata, info }) => {
			if (info.queueId !== queueId || info.gameCreation < sinceMs || isRemake(info.gameDuration)) return [];
			const p = info.participants.find((participant) => participant.puuid === puuid);
			if (!p) return [];
			return [
				{
					matchId: metadata.matchId,
					championName: p.championName,
					win: p.win,
					kills: p.kills,
					deaths: p.deaths,
					assists: p.assists,
					start: info.gameCreation,
					end: info.gameCreation + info.gameDuration * 1000,
				},
			];
		})
		.sort((a, b) => a.start - b.start);
}

/** The newest run of games (oldest first) where each gap is under `gapMs`; empty once the last game is `gapMs` old. */
export function autoSession(games: WidgetGame[], now: number, gapMs: number): WidgetGame[] {
	const newest = games.at(-1);
	if (!newest || now - newest.end >= gapMs) return [];
	let first = games.length - 1;
	while (first > 0 && games[first].start - games[first - 1].end < gapMs) first--;
	return games.slice(first);
}

// Only exact: the baseline must sit right before the session's first game, which its W/L proves
export function sessionLpChange(baseline: LpPoint | null, current: LpPoint, games: WidgetGame[]): number | null {
	if (!baseline || games.length === 0) return null;
	if (baseline.wins === null || baseline.losses === null || current.wins === null || current.losses === null) return null;
	if (baseline.wins + baseline.losses + games.length !== current.wins + current.losses) return null;
	return toAbsoluteLp(current.tier, current.rank, current.lp) - toAbsoluteLp(baseline.tier, baseline.rank, baseline.lp);
}
