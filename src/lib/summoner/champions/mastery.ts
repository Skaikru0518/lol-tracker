import { prisma } from "@/lib/server/db";
import { getAllMasteries, getTopMasteries } from "@/lib/riot/mastery";
import { isRecent, revalidateInBackground } from "@/lib/server/cache-utils";
import { type ChampionMastery } from "@/lib/validators/mastery";
import { allMasteryPlan } from "./mastery-plan";

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

/** One background full-list refresh per player at a time. */
const refreshing = new Map<string, Promise<void>>();

async function storeMasteries(puuid: string, masteries: { championId: number; championLevel: number; championPoints: number; lastPlayTime: number | bigint }[]) {
	const upserts = masteries.map((m) => {
		const data = { championLevel: m.championLevel, championPoints: m.championPoints, lastPlayTime: BigInt(m.lastPlayTime) };
		return prisma.championMastery.upsert({
			where: { puuid_championId: { puuid, championId: m.championId } },
			update: data,
			create: { puuid, championId: m.championId, ...data },
		});
	});
	// Marks the stored rows as the complete list; top-mastery refreshes never set this
	const synced = prisma.account.updateMany({ where: { puuid }, data: { masteriesSyncedAt: new Date() } });
	// ~170 upserts in one batch; Prisma's default 5 s would be tight on a slow DB link
	await prisma.$transaction([...upserts, synced], { timeout: 30_000 });
}

async function fetchAllAndStore(puuid: string): Promise<MasteryEntry[]> {
	const masteries = await getAllMasteries(puuid);
	storeMasteries(puuid, masteries).catch((error) => console.error("[mastery] storing the full list failed:", error));
	return masteries.map((m) => ({ ...m, lastPlayTime: Number(m.lastPlayTime) }));
}

/** Every champion's mastery: the stored list once a full sync happened (refreshed in the background after 30 min), else Riot, whose answer is then stored and marked synced. */
export async function resolveAllMasteries(puuid: string): Promise<MasteryEntry[]> {
	const [account, stored] = await Promise.all([
		prisma.account.findUnique({ where: { puuid }, select: { masteriesSyncedAt: true } }),
		prisma.championMastery.findMany({ where: { puuid }, orderBy: { championPoints: "desc" } }),
	]);
	const plan = allMasteryPlan(account?.masteriesSyncedAt ?? null, new Date());
	const fromDb = () => stored.map((m) => ({ ...m, lastPlayTime: Number(m.lastPlayTime) }));

	if (plan === "riot") {
		try {
			return await fetchAllAndStore(puuid);
		} catch {
			return fromDb();
		}
	}
	if (plan === "cached-revalidate" && !refreshing.has(puuid)) {
		const job = fetchAllAndStore(puuid)
			.then(() => undefined)
			.catch((error) => console.error("[mastery] background refresh failed:", error))
			.finally(() => refreshing.delete(puuid));
		refreshing.set(puuid, job);
	}
	return fromDb();
}
