import { queueSelection, type QueueFilter } from "@/lib/game/queue-filters";
import { type Match } from "@/lib/validators/match";

/** Matches for a queue chip and an optional champion; `all` keeps every queue, Arena included. */
export function filterMatches(matches: Match[], puuid: string, queue: QueueFilter, championName: string | null): Match[] {
	const ids = queue === "all" ? null : queueSelection(queue).ids;
	return matches.filter(
		(m) =>
			(!ids || ids.includes(m.info.queueId)) &&
			(!championName || m.info.participants.some((p) => p.puuid === puuid && p.championName === championName)),
	);
}
