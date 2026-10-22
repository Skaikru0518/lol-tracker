import { DEFAULT_PLATFORM, platformUrl } from "@/lib/game/platforms";
import { riotFetch } from "./riot";

/** Raw champion-v3 response; the shape changed over time, so callers validate it. */
export async function getChampionRotation() {
	return riotFetch<unknown>(`${platformUrl(DEFAULT_PLATFORM)}/lol/platform/v3/champion-rotations`);
}
