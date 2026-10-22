import { prisma } from "@/lib/server/db";
import { type Platform } from "@/lib/game/platforms";
import { getSummonerByPuuid } from "@/lib/riot/summoner";
import { RiotApiError } from "@/lib/riot/riot";
import { isRecent, revalidateInBackground } from "@/lib/server/cache-utils";
import { type Summoner } from "@/lib/validators/summoner";

const SUMMONER_MAX_AGE_SECONDS = 300;

async function fetchAndStoreSummoner(platform: Platform, puuid: string): Promise<Summoner> {
	const summoner = await getSummonerByPuuid(platform, puuid);
	const data = {
		profileIconId: summoner.profileIconId,
		summonerLevel: summoner.summonerLevel,
		revisionDate: BigInt(summoner.revisionDate),
	};
	await prisma.summoner.upsert({
		where: { puuid },
		update: data,
		create: { puuid, ...data },
	});
	return summoner;
}

/** Summoner on `platform`, or null when it has none there; the stored row only counts for the account's stored platform. */
export async function resolveSummoner(platform: Platform, puuid: string, stored: Platform | null): Promise<Summoner | null> {
	const cached = stored === platform ? await prisma.summoner.findUnique({ where: { puuid } }) : null;
	if (!cached) {
		try {
			return await fetchAndStoreSummoner(platform, puuid);
		} catch (error) {
			if (error instanceof RiotApiError && error.status === 404) return null;
			throw error;
		}
	}

	if (!isRecent(cached.updatedAt, SUMMONER_MAX_AGE_SECONDS)) {
		revalidateInBackground(async () => {
			await fetchAndStoreSummoner(platform, puuid);
		});
	}

	return {
		puuid: cached.puuid,
		profileIconId: cached.profileIconId,
		summonerLevel: cached.summonerLevel,
		revisionDate: Number(cached.revisionDate),
	};
}
