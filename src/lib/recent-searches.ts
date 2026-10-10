import { prisma } from "@/lib/db";
import { type RecentSearch } from "@/lib/validators/recent-searches";

export const RECENT_SEARCH_LIMIT = 8;

/** Account row with the relations `toRecentSearch` reads. */
export interface RecentSearchRow {
	puuid: string;
	gameName: string;
	tagLine: string;
	summoner: { profileIconId: number } | null;
	rankedEntries: { queueType: string; tier: string; rank: string; leaguePoints: number }[];
}

/** Account row to a recent-search card (solo rank only); `null` without a summoner on this platform. */
export function toRecentSearch(row: RecentSearchRow): RecentSearch | null {
	if (!row.summoner) return null;
	const solo = row.rankedEntries.find((entry) => entry.queueType === "RANKED_SOLO_5x5");
	return {
		puuid: row.puuid,
		gameName: row.gameName,
		tagLine: row.tagLine,
		profileIconId: row.summoner.profileIconId,
		soloTier: solo?.tier ?? null,
		soloRank: solo?.rank ?? null,
		soloLp: solo?.leaguePoints ?? null,
	};
}

/** Most recently looked-up accounts across all users. */
export async function getRecentSearches(): Promise<RecentSearch[]> {
	const rows = await prisma.account.findMany({
		where: { gameName: { not: "" }, summoner: { isNot: null } },
		orderBy: { updatedAt: "desc" },
		take: RECENT_SEARCH_LIMIT,
		select: {
			puuid: true,
			gameName: true,
			tagLine: true,
			summoner: { select: { profileIconId: true } },
			rankedEntries: {
				select: { queueType: true, tier: true, rank: true, leaguePoints: true },
			},
		},
	});
	return rows.map(toRecentSearch).filter((search) => search !== null);
}
