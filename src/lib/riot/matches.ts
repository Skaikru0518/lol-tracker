import { EURPOE_URL, riotFetch } from "./riot";
import { type Match } from "@/lib/validators/match";
import { type Timeline } from "@/lib/validators/timeline";

export async function getMatchIdsByPuuid(
	puuid: string,
	count: number = 20,
	championId?: number,
	start: number = 0,
) {
	const params = new URLSearchParams({ count: count.toString() });
	if (championId) params.set("champion", championId.toString());
	if (start > 0) params.set("start", start.toString());
	return riotFetch<string[]>(
		`${EURPOE_URL}/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?${params}`,
	);
}

/**
 * Participant fields Riot returns that nothing in this app reads.
 *
 * `challenges` is Riot's in-game challenge progress — unrelated to our own
 * achievements and badges, which are derived from kills, damage and the like.
 * It alone accounts for ~46% of a participant, and `missions` for another 3%.
 */
const UNUSED_PARTICIPANT_FIELDS = ["challenges", "missions"] as const;

/**
 * Drops the fields above from every participant, in place.
 *
 * Matches are stored verbatim, so trimming here rather than at each write site
 * keeps roughly half the bytes out of both the database and every response
 * built from it.
 */
function stripUnusedFields(match: Match): Match {
	for (const participant of match.info.participants) {
		for (const field of UNUSED_PARTICIPANT_FIELDS) {
			delete (participant as unknown as Record<string, unknown>)[field];
		}
	}

	return match;
}

export async function getMatchById(matchId: string) {
	const match = await riotFetch<Match>(
		`${EURPOE_URL}/lol/match/v5/matches/${encodeURIComponent(matchId)}`,
	);

	return stripUnusedFields(match);
}

export async function getMatchTimeline(matchId: string) {
	return riotFetch<Timeline>(
		`${EURPOE_URL}/lol/match/v5/matches/${encodeURIComponent(matchId)}/timeline`,
	);
}
