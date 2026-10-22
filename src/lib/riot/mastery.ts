import { platformUrl, type Platform } from "@/lib/game/platforms";
import { riotFetch } from "./riot";
import { type ChampionMastery } from "@/lib/validators/mastery";

export async function getTopMasteries(platform: Platform, puuid: string, count: number = 5) {
	return riotFetch<ChampionMastery[]>(
		`${platformUrl(platform)}/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(puuid)}/top?count=${count}`,
	);
}

export async function getAllMasteries(platform: Platform, puuid: string) {
	return riotFetch<ChampionMastery[]>(
		`${platformUrl(platform)}/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(puuid)}`,
	);
}
