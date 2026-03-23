import { EURPOE_URL, riotFetch } from "./riot";
import { type Match } from "@/lib/validators/match";
import { type Timeline } from "@/lib/validators/timeline";

export async function getMatchIdsByPuuid(
	puuid: string,
	count: number = 20,
	championId?: number,
) {
	const params = new URLSearchParams({ count: count.toString() });
	if (championId) params.set("champion", championId.toString());
	return riotFetch<string[]>(
		`${EURPOE_URL}/lol/match/v5/matches/by-puuid/${puuid}/ids?${params}`,
		60,
	);
}

export async function getMatchById(matchId: string) {
	return riotFetch<Match>(
		`${EURPOE_URL}/lol/match/v5/matches/${matchId}`,
		86400,
	);
}

export async function getMatchTimeline(matchId: string) {
	return riotFetch<Timeline>(
		`${EURPOE_URL}/lol/match/v5/matches/${matchId}/timeline`,
		86400,
	);
}
