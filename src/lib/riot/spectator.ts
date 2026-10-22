import { platformUrl, type Platform } from "@/lib/game/platforms";
import { riotFetch } from "./riot";
import { type LiveGame } from "@/lib/validators/live-game";

export async function getLiveGame(platform: Platform, puuid: string) {
	return riotFetch<LiveGame>(
		`${platformUrl(platform)}/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(puuid)}`,
	);
}
