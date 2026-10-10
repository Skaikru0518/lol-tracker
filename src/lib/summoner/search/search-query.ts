import { parseRiotId } from "@/lib/game/riot-id";

const MIN_NAME = 2;
const MAX_INPUT = 40;

/** Typed search text as a name prefix and optional tag prefix; null below two name characters. */
export function parseSearchTerms(raw: string): { name: string; tag: string | null } | null {
	const text = raw.trim().slice(0, MAX_INPUT);
	const separator = text.indexOf("#");
	const name = (separator === -1 ? text : text.slice(0, separator)).trim();
	if (name.length < MIN_NAME) return null;
	const tag = separator === -1 ? "" : text.slice(separator + 1).trim();
	return { name, tag: tag || null };
}

/** A full `Name#TAG` the results don't already contain, to offer as a Riot lookup; null otherwise. */
export function lookupCandidate(raw: string, results: { gameName: string; tagLine: string }[]): { gameName: string; tagLine: string } | null {
	const riotId = parseRiotId(raw.trim());
	if (!riotId) return null;
	const listed = results.some(
		(r) => r.gameName.toLowerCase() === riotId.gameName.toLowerCase() && r.tagLine.toLowerCase() === riotId.tagLine.toLowerCase(),
	);
	return listed ? null : riotId;
}

/** Text for a LIKE pattern with `%`, `_` and the `\` escape character escaped, so it matches literally. */
export function likeLiteral(text: string): string {
	return text.replace(/[\\%_]/g, "\\$&");
}
