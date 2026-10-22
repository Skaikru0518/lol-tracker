import { platformUrl, type Platform } from "@/lib/game/platforms";
import { riotFetch } from "./riot";
import { type RankedEntry } from "../validators/ranked";

export async function getRankedByPuuid(platform: Platform, puuid: string) {
	return riotFetch<RankedEntry[]>(
		`${platformUrl(platform)}/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`,
	);
}
