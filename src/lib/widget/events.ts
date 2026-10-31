import { toAbsoluteLp } from "@/lib/summoner/profile/lp-change";
import { type WidgetData, type WidgetGame, type WidgetRank } from "@/lib/validators/widget";

export interface WidgetEvents {
	newGames: string[];
	result: "win" | "loss" | null;
	lpDelta: number | null;
	rank: "up" | "down" | null;
}

export function trailingWinStreak(games: WidgetGame[]): number {
	let streak = 0;
	for (let i = games.length - 1; i >= 0 && games[i].win; i--) streak++;
	return streak;
}

const absolute = (r: WidgetRank) => toAbsoluteLp(r.tier, r.division, r.leaguePoints);

/** What changed between two refreshes, so the widget knows which animations to play. */
export function widgetEvents(prev: WidgetData | null, next: WidgetData): WidgetEvents {
	if (!prev) return { newGames: [], result: null, lpDelta: null, rank: null };

	const known = new Set(prev.games.map((g) => g.matchId));
	const fresh = next.games.filter((g) => !known.has(g.matchId));
	const newest = fresh.at(-1);

	let lpDelta: number | null = null;
	let rank: WidgetEvents["rank"] = null;
	if (prev.rank && next.rank) {
		const delta = absolute(next.rank) - absolute(prev.rank);
		if (delta !== 0) lpDelta = delta;
		if (prev.rank.tier !== next.rank.tier || prev.rank.division !== next.rank.division) rank = delta > 0 ? "up" : "down";
	}

	return { newGames: fresh.map((g) => g.matchId), result: newest ? (newest.win ? "win" : "loss") : null, lpDelta, rank };
}
