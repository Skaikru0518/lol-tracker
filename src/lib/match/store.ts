import { prisma } from "@/lib/server/db";
import { getMatchById } from "@/lib/riot/matches";
import { type Match } from "@/lib/validators/match";

export async function fetchAndStoreMatch(matchId: string): Promise<Match> {
	const match = await getMatchById(matchId);
	await prisma.match.upsert({
		where: { matchId },
		update: {},
		create: {
			matchId,
			queueId: match.info.queueId,
			gameMode: match.info.gameMode,
			gameDuration: match.info.gameDuration,
			gameCreation: BigInt(match.info.gameCreation),
			data: match as never,
		},
	});
	return match;
}
