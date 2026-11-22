import { type DuoGame } from "./partners";

export interface SharedSide {
	championName: string;
	kills: number;
	deaths: number;
	assists: number;
	score: number | null;
}

export interface SharedGame {
	matchId: string;
	gameCreation: number;
	win: boolean;
	player: SharedSide;
	friend: SharedSide;
	crown: "player" | "friend" | null;
}

/** `games` are already the shared ones (see sharedGames); a game missing either player is skipped. */
export function toSharedGames(games: DuoGame[], puuid: string, friend: string, scores: Record<string, Record<string, number>>): SharedGame[] {
	return games.flatMap((game) => {
		const me = game.participants.find((p) => p.puuid === puuid);
		const fr = game.participants.find((p) => p.puuid === friend);
		if (!me || !fr) return [];
		const side = (p: typeof me): SharedSide => ({
			championName: p.championName,
			kills: p.kills,
			deaths: p.deaths,
			assists: p.assists,
			score: scores[game.matchId]?.[p.puuid] ?? null,
		});
		const player = side(me);
		const other = side(fr);
		const crown = player.score === null || other.score === null || player.score === other.score ? null : player.score > other.score ? "player" : "friend";
		return [{ matchId: game.matchId, gameCreation: game.gameCreation, win: me.win, player, friend: other, crown }];
	});
}

export function together(shared: SharedGame[]): { wins: number; losses: number; playerCarried: number; friendCarried: number } {
	const wins = shared.filter((g) => g.win).length;
	return {
		wins,
		losses: shared.length - wins,
		playerCarried: shared.filter((g) => g.crown === "player").length,
		friendCarried: shared.filter((g) => g.crown === "friend").length,
	};
}

const FULL_SAMPLE = 30;

/** Scored games behind an average when there are fewer than 30, else null; the average is built from scored games only. */
export function thinSample(summary: { scoredGames: number }): number | null {
	return summary.scoredGames < FULL_SAMPLE ? summary.scoredGames : null;
}
