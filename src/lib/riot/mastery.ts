import { BASE_URL, riotFetch } from "./riot";
import { type ChampionMastery } from "@/lib/validators/mastery";

export async function getTopMasteries(puuid: string, count: number = 5) {
	return riotFetch<ChampionMastery[]>(
		`${BASE_URL}/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=${count}`,
	);
}
