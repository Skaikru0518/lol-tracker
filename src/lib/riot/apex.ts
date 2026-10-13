import { BASE_URL, riotFetch } from "./riot";
import { type ApexQueue } from "../validators/apex";

export function getApexLeague(tier: "grandmaster" | "challenger", queue: ApexQueue) {
	return riotFetch<{ entries: { leaguePoints: number }[] }>(`${BASE_URL}/lol/league/v4/${tier}leagues/by-queue/${queue}`);
}
