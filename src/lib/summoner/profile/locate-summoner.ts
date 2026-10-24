import { prisma } from "@/lib/server/db";
import { storedPlatform, type Platform } from "@/lib/game/platforms";
import { getActiveRegion } from "@/lib/riot/account";
import { RiotApiError } from "@/lib/riot/riot";
import { type Account, type Summoner } from "@/lib/validators/summoner";
import { resolveAccount } from "./account";
import { locatePlatform } from "./locate";
import { resolveSummoner } from "./summoner";

async function activeRegion(puuid: string): Promise<string | null> {
	try {
		return (await getActiveRegion(puuid)).region;
	} catch (error) {
		if (error instanceof RiotApiError && error.status === 404) return null;
		throw error;
	}
}

// One tracked platform per account: moving it drops the old platform's ranked and mastery rows
export async function recordPlatform(puuid: string, stored: Platform | null, platform: Platform): Promise<void> {
	if (stored === platform) return;
	if (stored) {
		await prisma.$transaction([
			prisma.rankedEntry.deleteMany({ where: { puuid } }),
			prisma.championMastery.deleteMany({ where: { puuid } }),
			prisma.account.update({ where: { puuid }, data: { platform, masteriesSyncedAt: null } }),
		]);
		return;
	}
	await prisma.account.update({ where: { puuid }, data: { platform } });
}

export async function locateSummoner(puuid: string, hint: Platform | null): Promise<{ platform: Platform; summoner: Summoner } | null> {
	const row = await prisma.account.findUnique({ where: { puuid }, select: { platform: true } });
	const stored = storedPlatform(row?.platform);
	const found = await locatePlatform(
		{ hint, stored },
		{ trySummoner: (platform) => resolveSummoner(platform, puuid, stored), activeRegion: () => activeRegion(puuid) },
	);
	if (found) await recordPlatform(puuid, stored, found.platform);
	return found;
}

export async function locateAccount(gameName: string, tagLine: string, hint: Platform | null): Promise<{ account: Account; platform: Platform } | null> {
	let account: Account;
	try {
		account = await resolveAccount(gameName, tagLine);
	} catch (error) {
		if (error instanceof RiotApiError && error.status === 404) return null;
		throw error;
	}
	const found = await locateSummoner(account.puuid, hint);
	return found && { account, platform: found.platform };
}
