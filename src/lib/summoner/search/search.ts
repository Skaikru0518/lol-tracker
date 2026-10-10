import { prisma } from "@/lib/server/db";
import { toRecentSearch } from "@/lib/home/recent-searches";
import { type RecentSearch } from "@/lib/validators/recent-searches";
import { likeLiteral } from "./search-query";
import { mergeExactFirst } from "./search-results";

const SUGGESTION_LIMIT = 8;

const SELECT = {
	puuid: true,
	gameName: true,
	tagLine: true,
	summoner: { select: { profileIconId: true } },
	rankedEntries: { select: { queueType: true, tier: true, rank: true, leaguePoints: true } },
} as const;

/** Stored summoners named exactly like the typed text first, then those whose name (and tag, if given) starts with it, with solo rank. */
export async function searchSummoners(terms: { name: string; tag: string | null }): Promise<RecentSearch[]> {
	const tag = terms.tag ? { tagLine: { startsWith: likeLiteral(terms.tag), mode: "insensitive" as const } } : {};
	// Prisma's insensitive `equals` compiles to ILIKE, so the exact name is escaped too
	const query = (gameName: { equals: string } | { startsWith: string }) =>
		prisma.account.findMany({
			where: { gameName: { ...gameName, mode: "insensitive" }, ...tag, summoner: { isNot: null } },
			orderBy: { updatedAt: "desc" },
			take: SUGGESTION_LIMIT,
			select: SELECT,
		});
	const [exact, prefix] = await Promise.all([query({ equals: likeLiteral(terms.name) }), query({ startsWith: likeLiteral(terms.name) })]);
	const toSearch = (rows: typeof exact) => rows.map(toRecentSearch).filter((r) => r !== null);
	return mergeExactFirst(toSearch(exact), toSearch(prefix), SUGGESTION_LIMIT);
}
