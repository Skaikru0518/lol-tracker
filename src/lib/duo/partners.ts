export interface DuoParticipant {
	puuid: string;
	teamId: number;
	win: boolean;
	teamPosition: string;
	championName: string;
	kills: number;
	deaths: number;
	assists: number;
	riotIdGameName: string;
	riotIdTagline: string;
	profileIcon: number;
}

/** A stored game, newest first in every list. */
export interface DuoGame {
	matchId: string;
	queueId: number;
	gameCreation: number;
	participants: DuoParticipant[];
}

export interface DuoPartner {
	puuid: string;
	gameName: string;
	tagLine: string;
	profileIcon: number;
	games: number;
	wins: number;
	winRate: number;
	difference: number | null;
	role: string | null;
}

const MIN_GAMES_TOGETHER = 3;

const teammates = (game: DuoGame, puuid: string): DuoParticipant[] => {
	const me = game.participants.find((p) => p.puuid === puuid);
	return me ? game.participants.filter((p) => p.teamId === me.teamId && p.puuid !== puuid) : [];
};

const mostFrequent = (values: string[]): string | null => {
	const counts = new Map<string, number>();
	for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
	return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
};

/** Players on the profile's team in 3+ of the games, most games first, then best win rate. */
export function duoPartners(games: DuoGame[], puuid: string, limit = 10): DuoPartner[] {
	const mine = games.filter((g) => g.participants.some((p) => p.puuid === puuid));
	const seen = new Map<string, DuoParticipant[]>();
	for (const game of mine) for (const mate of teammates(game, puuid)) seen.set(mate.puuid, [...(seen.get(mate.puuid) ?? []), mate]);

	return [...seen.entries()]
		.filter(([, appearances]) => appearances.length >= MIN_GAMES_TOGETHER)
		.map(([mate, appearances]) => {
			const latest = appearances[0];
			const wins = appearances.filter((a) => a.win).length;
			const without = mine.filter((g) => !teammates(g, puuid).some((p) => p.puuid === mate));
			const winsWithout = without.filter((g) => g.participants.find((p) => p.puuid === puuid)?.win).length;
			const rate = wins / appearances.length;
			return {
				puuid: mate,
				gameName: latest.riotIdGameName || "Unknown",
				// No tag without a name, so nothing links to a made-up Riot ID
				tagLine: latest.riotIdGameName ? latest.riotIdTagline : "",
				profileIcon: latest.profileIcon,
				games: appearances.length,
				wins,
				winRate: Math.round(rate * 100),
				difference: without.length ? Math.round((rate - winsWithout / without.length) * 100) : null,
				role: mostFrequent(appearances.map((a) => a.teamPosition)),
			};
		})
		.sort((a, b) => b.games - a.games || b.winRate - a.winRate)
		.slice(0, limit);
}

export function sharedGames(games: DuoGame[], puuid: string, friend: string): DuoGame[] {
	return games.filter((g) => teammates(g, puuid).some((p) => p.puuid === friend));
}
