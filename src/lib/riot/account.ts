import { EUROPE_URL, riotFetch } from "./riot";
import { accountRegionSchema, type AccountRegion } from "@/lib/validators/account-region";
import { type Account } from "@/lib/validators/summoner";

export async function getAccountById(gameName: string, tagLine: string) {
	return riotFetch<Account>(
		`${EUROPE_URL}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
	);
}

export async function getActiveRegion(puuid: string): Promise<AccountRegion> {
	return accountRegionSchema.parse(await riotFetch<unknown>(`${EUROPE_URL}/riot/account/v1/region/by-game/lol/by-puuid/${encodeURIComponent(puuid)}`));
}
