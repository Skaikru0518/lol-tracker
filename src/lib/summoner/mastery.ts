import { prisma } from "@/lib/db";
import { getAllMasteries, getTopMasteries } from "@/lib/riot/mastery";
import { isRecent, revalidateInBackground } from "@/lib/cache-utils";
import { type ChampionMastery } from "@/lib/validators/mastery";

const MASTERY_MAX_AGE_SECONDS = 1800;

/** The mastery fields both the DB and the Riot path provide. */
export type MasteryEntry = Pick<
	ChampionMastery,
	"puuid" | "championId" | "championLevel" | "championPoints" | "lastPlayTime"
>;

async function fetchAndStoreMasteries(puuid: string, count: number): Promise<MasteryEntry[]> {
	const masteries = await getTopMasteries(puuid, count);

	for (const mastery of masteries) {
		const data = {
			championLevel: mastery.championLevel,
			championPoints: mastery.championPoints,
			lastPlayTime: BigInt(mastery.lastPlayTime),
		};
		await prisma.championMastery.upsert({
			where: { puuid_championId: { puuid, championId: mastery.championId } },
			update: data,
			create: { puuid, championId: mastery.championId, ...data },
		});
	}

	return masteries.map((mastery) => ({ ...mastery, lastPlayTime: Number(mastery.lastPlayTime) }));
}

/** Top masteries by points, DB first; `lastPlayTime` is a number in both paths. */
export async function resolveTopMasteries(puuid: string, count: number): Promise<MasteryEntry[]> {
	const cached = await prisma.championMastery.findMany({
		where: { puuid },
		orderBy: { championPoints: "desc" },
		take: count,
	});

	if (cached.length === 0) return fetchAndStoreMasteries(puuid, count);

	if (!cached.every((entry) => isRecent(entry.updatedAt, MASTERY_MAX_AGE_SECONDS))) {
		revalidateInBackground(async () => {
			await fetchAndStoreMasteries(puuid, count);
		});
	}

	return cached.map((entry) => ({ ...entry, lastPlayTime: Number(entry.lastPlayTime) }));
}

/** Every champion's mastery straight from Riot (not stored); stored rows are the fallback when Riot fails. */
export async function resolveAllMasteries(puuid: string): Promise<MasteryEntry[]> {
	try {
		const masteries = await getAllMasteries(puuid);
		return masteries.map((m) => ({ ...m, lastPlayTime: Number(m.lastPlayTime) }));
	} catch {
		const stored = await prisma.championMastery.findMany({ where: { puuid }, orderBy: { championPoints: "desc" } });
		return stored.map((m) => ({ ...m, lastPlayTime: Number(m.lastPlayTime) }));
	}
}
