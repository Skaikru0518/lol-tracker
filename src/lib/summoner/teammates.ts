import { type Match } from "@/lib/validators/match";

/** A teammate seen in at least two recent games. */
export interface RecentTeammate {
	puuid: string;
	gameName: string;
	tagLine: string;
	profileIcon: number;
	games: number;
	wins: number;
}

const MIN_GAMES_TOGETHER = 2;

/** Players who were on the player's team at least twice, most games first. */
export function getRecentTeammates(matches: Match[], puuid: string, limit = 5): RecentTeammate[] {
	const byPuuid = new Map<string, RecentTeammate>();

	for (const match of matches) {
		const me = match.info.participants.find((p) => p.puuid === puuid);
		if (!me) continue;

		for (const p of match.info.participants) {
			if (p.teamId !== me.teamId || p.puuid === puuid) continue;
			const entry = byPuuid.get(p.puuid) ?? {
				puuid: p.puuid,
				gameName: p.riotIdGameName,
				tagLine: p.riotIdTagline,
				profileIcon: p.profileIcon,
				games: 0,
				wins: 0,
			};
			entry.games++;
			if (p.win) entry.wins++;
			byPuuid.set(p.puuid, entry);
		}
	}

	return [...byPuuid.values()]
		.filter((t) => t.games >= MIN_GAMES_TOGETHER)
		.sort((a, b) => b.games - a.games)
		.slice(0, limit);
}
