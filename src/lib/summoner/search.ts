import { prisma } from "@/lib/db";
import { toRecentSearch } from "@/lib/recent-searches";
import { type RecentSearch } from "@/lib/validators/recent-searches";
import { likeLiteral, sortExactFirst } from "./search-query";

const SUGGESTION_LIMIT = 8;

/** Stored summoners whose name (and tag, if given) starts with the typed text, exact names first, with solo rank. */
export async function searchSummoners(terms: { name: string; tag: string | null }): Promise<RecentSearch[]> {
	const rows = await prisma.account.findMany({
		where: {
			gameName: { startsWith: likeLiteral(terms.name), mode: "insensitive" },
			...(terms.tag ? { tagLine: { startsWith: likeLiteral(terms.tag), mode: "insensitive" } } : {}),
			summoner: { isNot: null },
		},
		orderBy: { updatedAt: "desc" },
		take: SUGGESTION_LIMIT,
		select: {
			puuid: true,
			gameName: true,
			tagLine: true,
			summoner: { select: { profileIconId: true } },
			rankedEntries: { select: { queueType: true, tier: true, rank: true, leaguePoints: true } },
		},
	});
	return sortExactFirst(rows.map(toRecentSearch).filter((r) => r !== null), terms.name);
}
