import { BASE_URL, riotFetch } from "./riot";

/** Raw champion-v3 response; the shape changed over time, so callers validate it. */
export async function getChampionRotation() {
	return riotFetch<unknown>(`${BASE_URL}/lol/platform/v3/champion-rotations`);
}
