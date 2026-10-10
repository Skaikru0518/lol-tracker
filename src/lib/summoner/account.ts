import { prisma } from "@/lib/db";
import { getAccountById } from "@/lib/riot/account";
import { isRecent, revalidateInBackground } from "@/lib/cache-utils";
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

/** Account by Riot ID: DB first (revalidated in the background when stale), else Riot. */
export async function resolveAccount(gameName: string, tagLine: string): Promise<Account> {
	const cached = await prisma.account.findFirst({ where: { gameName, tagLine } });
	if (!cached) return fetchAndStoreAccount(gameName, tagLine);

	if (!isRecent(cached.updatedAt, ACCOUNT_MAX_AGE_SECONDS)) {
		revalidateInBackground(async () => {
			await fetchAndStoreAccount(gameName, tagLine);
		});
	}

	return { puuid: cached.puuid, gameName: cached.gameName, tagLine: cached.tagLine };
}
