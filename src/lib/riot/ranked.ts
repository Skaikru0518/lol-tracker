import { BASE_URL, riotFetch } from "./riot";
import { type RankedEntry } from "../validators/ranked";

export async function getRankedByPuuid(puuid: string) {
	return riotFetch<RankedEntry[]>(
		`${BASE_URL}/lol/league/v4/entries/by-puuid/${puuid}`,
		120,
	);
}
