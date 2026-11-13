import { prisma } from "@/lib/server/db";
import { getAccountById } from "@/lib/riot/account";
import { isRecent, revalidateInBackground } from "@/lib/server/cache-utils";
import { type Account } from "@/lib/validators/summoner";

const ACCOUNT_MAX_AGE_SECONDS = 600;

async function fetchAndStoreAccount(gameName: string, tagLine: string): Promise<Account> {
	const account = await getAccountById(gameName, tagLine);
	await prisma.account.upsert({
		where: { puuid: account.puuid },
		update: { gameName: account.gameName, tagLine: account.tagLine },
		create: { puuid: account.puuid, gameName: account.gameName, tagLine: account.tagLine },
	});
	return account;
}

/** Case-insensitive equality; Prisma runs it as ILIKE, so `_` and `%` would otherwise match any character. */
export function sameText(value: string) {
	return { equals: value.replace(/[\\%_]/g, "\\$&"), mode: "insensitive" as const };
}

/** Account by Riot ID: DB first (revalidated in the background when stale), else Riot. */
export async function resolveAccount(gameName: string, tagLine: string): Promise<Account> {
	// Riot IDs are case-insensitive; an exact match missed every differently cased URL and went to Riot
	const cached = await prisma.account.findFirst({ where: { gameName: sameText(gameName), tagLine: sameText(tagLine) } });
	if (!cached) return fetchAndStoreAccount(gameName, tagLine);

	if (!isRecent(cached.updatedAt, ACCOUNT_MAX_AGE_SECONDS)) {
		revalidateInBackground(async () => {
			await fetchAndStoreAccount(gameName, tagLine);
		});
	}

	return { puuid: cached.puuid, gameName: cached.gameName, tagLine: cached.tagLine };
}
