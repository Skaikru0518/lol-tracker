import { platformUrl, type Platform } from "@/lib/game/platforms";
import { riotFetch } from "./riot";
import { type ApexQueue } from "../validators/apex";

export function getApexLeague(platform: Platform, tier: "grandmaster" | "challenger", queue: ApexQueue) {
	return riotFetch<{ entries: { leaguePoints: number }[] }>(`${platformUrl(platform)}/lol/league/v4/${tier}leagues/by-queue/${queue}`);
}
