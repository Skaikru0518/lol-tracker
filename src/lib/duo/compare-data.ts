import { prisma } from "@/lib/server/db";
import { matchScores } from "@/lib/performance/batch";
import { recentPerformance } from "@/lib/performance/recent";
import { type DuoComparePayload, type DuoSidePayload } from "@/lib/validators/duo";
import { together, toSharedGames } from "./compare";
import { sharedGames, type DuoGame } from "./partners";
import { loadDuoWindow } from "./query";

async function side(puuid: string, latestGame: DuoGame | undefined): Promise<DuoSidePayload> {
	const fromGame = latestGame?.participants.find((p) => p.puuid === puuid);
	const [summary, rank, account] = await Promise.all([
		recentPerformance(puuid),
		prisma.rankedEntry.findFirst({ where: { puuid, queueType: "RANKED_SOLO_5x5" }, select: { tier: true, rank: true, leaguePoints: true } }),
		fromGame ? null : prisma.account.findUnique({ where: { puuid }, select: { gameName: true, tagLine: true } }),
	]);
	return {
		puuid,
		gameName: fromGame?.riotIdGameName || account?.gameName || "Unknown",
		tagLine: fromGame?.riotIdTagline ?? account?.tagLine ?? "",
		profileIcon: fromGame?.profileIcon ?? 0,
		rank,
		summary,
	};
}

/** Both players' recent form and their shared games in the profile's 50-game window; Postgres only. */
export async function duoCompare(puuid: string, friend: string): Promise<DuoComparePayload> {
	const window = await loadDuoWindow(puuid);
	const games = sharedGames(window, puuid, friend);
	const scores = await matchScores(games.map((g) => g.matchId));
	const shared = toSharedGames(games, puuid, friend, scores);
	const [player, other] = await Promise.all([side(puuid, games[0] ?? window[0]), side(friend, games[0])]);
	return { player, friend: other, shared, together: together(shared) };
}
