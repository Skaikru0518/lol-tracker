import { BASE_URL, riotFetch } from "./riot";

export interface SummonerData {
	id: string;
	accountId: string;
	puuid: string;
	profileIconId: number;
	summonerLevel: number;
}

export async function getSummonerByPuuid(puuid: string) {
	return riotFetch<SummonerData>(
		`${BASE_URL}/lol/summoner/v4/summoners/by-puuid/${puuid}`,
	);
}
