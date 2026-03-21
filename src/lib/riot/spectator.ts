import { BASE_URL, riotFetch } from "./riot";
import { type LiveGame } from "@/lib/validators/live-game";

export async function getLiveGame(puuid: string) {
	return riotFetch<LiveGame>(
		`${BASE_URL}/lol/spectator/v5/active-games/by-summoner/${puuid}`,
	);
}
