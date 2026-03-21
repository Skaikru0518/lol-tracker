import { EURPOE_URL, riotFetch } from "./riot";

export async function getMatchIdsByPuuid(
	puuid: string,
	count: number = 20,
	championId?: number,
) {
	const params = new URLSearchParams({ count: count.toString() });
	if (championId) params.set("champion", championId.toString());
	return riotFetch<string[]>(
		`${EURPOE_URL}/lol/match/v5/matches/by-puuid/${puuid}/ids?${params}`,
	);
}

export async function getMatchById(matchId: string) {
	return riotFetch(`${EURPOE_URL}/lol/match/v5/matches/${matchId}`);
}

import { type Timeline } from "@/lib/validators/timeline";

export async function getMatchTimeline(matchId: string) {
	return riotFetch<Timeline>(
		`${EURPOE_URL}/lol/match/v5/matches/${matchId}/timeline`,
	);
}
