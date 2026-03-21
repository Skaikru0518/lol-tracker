import { EURPOE_URL, riotFetch } from "./riot";

export async function getAccountById(gameName: string, tagLine: string) {
	return riotFetch(
		`${EURPOE_URL}/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`,
		600,
	);
}
