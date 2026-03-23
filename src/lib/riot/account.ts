import { EURPOE_URL, riotFetch } from "./riot";
import { type Account } from "@/lib/validators/summoner";

export async function getAccountById(gameName: string, tagLine: string) {
	return riotFetch<Account>(
		`${EURPOE_URL}/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`,
		600,
	);
}
