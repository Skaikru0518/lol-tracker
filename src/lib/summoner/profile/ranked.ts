import { prisma } from "@/lib/server/db";
import { getRankedByPuuid } from "@/lib/riot/ranked";
import { isRecent, revalidateInBackground } from "@/lib/server/cache-utils";
import { type RankedEntry } from "@/lib/validators/ranked";

const RANKED_MAX_AGE_SECONDS = 120;

/** Whether a ranked entry differs from the last LP snapshot, or there is none yet. */
export function shouldSnapshot(
	last: { tier: string; rank: string; lp: number } | null,
	entry: { tier: string; rank: string; leaguePoints: number },
): boolean {
	return (
		!last ||
		last.tier !== entry.tier ||
		last.rank !== entry.rank ||
		last.lp !== entry.leaguePoints
	);
}

/** Upserts ranked entries and records an LP snapshot for each changed one; returns snapshots created. */
export async function saveRankedEntries(
	puuid: string,
	entries: RankedEntry[],
): Promise<number> {
	let created = 0;

	for (const entry of entries) {
		const data = {
			tier: entry.tier,
			rank: entry.rank,
			leaguePoints: entry.leaguePoints,
			wins: entry.wins,
			losses: entry.losses,
			hotStreak: entry.hotStreak,
			veteran: entry.veteran,
			freshBlood: entry.freshBlood,
			inactive: entry.inactive,
		};

		await prisma.rankedEntry.upsert({
			where: { puuid_queueType: { puuid, queueType: entry.queueType } },
			update: data,
			create: { puuid, queueType: entry.queueType, ...data },
		});

		const last = await prisma.lPHistory.findFirst({
			where: { puuid, queueType: entry.queueType },
			orderBy: { createdAt: "desc" },
		});

		if (shouldSnapshot(last, entry)) {
			await prisma.lPHistory.create({
				data: {
					puuid,
					queueType: entry.queueType,
					tier: entry.tier,
					rank: entry.rank,
					lp: entry.leaguePoints,
					wins: entry.wins,
					losses: entry.losses,
				},
			});
			created++;
		}
	}

	return created;
}

/** Ranked entries, DB first; `force` or an empty DB fetches Riot synchronously. */
export async function resolveRankedEntries(
	puuid: string,
	{ force = false }: { force?: boolean } = {},
): Promise<RankedEntry[]> {
	const cached = await prisma.rankedEntry.findMany({ where: { puuid } });

	if (force || cached.length === 0) {
		const entries = await getRankedByPuuid(puuid);
		await saveRankedEntries(puuid, entries);
		return entries;
	}

	if (!cached.every((entry) => isRecent(entry.updatedAt, RANKED_MAX_AGE_SECONDS))) {
		revalidateInBackground(async () => {
			await saveRankedEntries(puuid, await getRankedByPuuid(puuid));
		});
	}

	return cached;
}
