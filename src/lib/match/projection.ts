import { participantSchema } from "@/lib/validators/match";

/**
 * Participant fields the app reads, taken straight from the Zod schema so the
 * projection cannot drift from what the client is typed to receive. Adding a
 * field to `participantSchema` is enough to start sending it.
 */
const PARTICIPANT_FIELDS = Object.keys(participantSchema.shape);

interface StoredMatch {
	info?: { participants?: Record<string, unknown>[] } & Record<string, unknown>;
}

/**
 * Narrows a stored match to the participant fields `matchSchema` declares.
 *
 * Riot returns about 154 fields per participant and roughly a third are read
 * here, while participants are ~97% of a match document. Nothing is discarded:
 * the full match stays in the database, this only trims the response, which is
 * where the bytes cost real time on a user's connection.
 */
export function projectMatch(match: unknown): unknown {
	const stored = match as StoredMatch;
	const participants = stored?.info?.participants;
	if (!Array.isArray(participants)) return match;

	return {
		...stored,
		info: {
			...stored.info,
			participants: participants.map((participant) => {
				const projected: Record<string, unknown> = {};
				for (const field of PARTICIPANT_FIELDS) {
					if (field in participant) projected[field] = participant[field];
				}

				return projected;
			}),
		},
	};
}
