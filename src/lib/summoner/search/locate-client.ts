import { type Platform } from "@/lib/game/platforms";
import { locateResultSchema, type LocateResult } from "@/lib/validators/locate";

/** Platform and canonical slug of a Riot ID, looking on `hint` first; null when it has no supported summoner. */
export async function locateSummoner(gameName: string, tagLine: string, hint: Platform): Promise<LocateResult | null> {
	const res = await fetch(`/api/summoner/locate?${new URLSearchParams({ gameName, tagLine, platform: hint })}`);
	if (res.status === 404) return null;
	if (!res.ok) throw new Error("Failed to locate summoner");
	return locateResultSchema.parse(await res.json());
}
