import { BASE_URL, riotFetch } from "./riot";
import { type Summoner } from "@/lib/validators/summoner";

export async function getSummonerByPuuid(puuid: string) {
	return riotFetch<Summoner>(
		`${BASE_URL}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`,
	);
}
