import { platformUrl, type Platform } from "@/lib/game/platforms";
import { riotFetch } from "./riot";
import { type Summoner } from "@/lib/validators/summoner";

export async function getSummonerByPuuid(platform: Platform, puuid: string) {
	return riotFetch<Summoner>(
		`${platformUrl(platform)}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`,
	);
}
