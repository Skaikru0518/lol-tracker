import { prisma } from "@/lib/db";
import { getSummonerByPuuid } from "@/lib/riot/summoner";
import { isRecent, revalidateInBackground } from "@/lib/cache-utils";
import { type Summoner } from "@/lib/validators/summoner";

const SUMMONER_MAX_AGE_SECONDS = 300;

async function fetchAndStoreSummoner(puuid: string): Promise<Summoner> {
	const summoner = await getSummonerByPuuid(puuid);
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

/** Summoner by puuid: DB first (revalidated in the background when stale), else Riot. */
export async function resolveSummoner(puuid: string): Promise<Summoner> {
	const cached = await prisma.summoner.findUnique({ where: { puuid } });
	if (!cached) return fetchAndStoreSummoner(puuid);

	if (!isRecent(cached.updatedAt, SUMMONER_MAX_AGE_SECONDS)) {
		revalidateInBackground(async () => {
			await fetchAndStoreSummoner(puuid);
		});
	}

	return {
		puuid: cached.puuid,
		profileIconId: cached.profileIconId,
		summonerLevel: cached.summonerLevel,
		revisionDate: Number(cached.revisionDate),
	};
}
