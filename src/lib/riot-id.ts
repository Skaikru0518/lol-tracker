/**
 * Riot IDs are `GameName#TagLine`. The `/summoner/[name]` route joins the two
 * with a dash instead, because `#` cannot appear in a path.
 *
 * Game names may themselves contain dashes ("Cool-Guy#EUNE") while tag lines
 * cannot, so the slug has to be split at the *last* dash. Splitting at the
 * first one turned "Cool-Guy#EUNE" into gameName "Cool", tagLine "Guy".
 */
export interface RiotId {
	gameName: string;
	tagLine: string;
}

/** Splits a `/summoner/[name]` slug back into its Riot ID parts. */
export function parseSummonerSlug(slug: string): RiotId {
	const separator = slug.lastIndexOf("-");
	if (separator === -1) return { gameName: slug, tagLine: "" };

	return {
		gameName: slug.slice(0, separator),
		tagLine: slug.slice(separator + 1),
	};
}

/** Builds the `/summoner/[name]` slug for a Riot ID. */
export function toSummonerSlug(gameName: string, tagLine: string): string {
	return encodeURIComponent(`${gameName}-${tagLine}`);
}

/** Splits user input of the form `GameName#TAG`. Returns null if malformed. */
export function parseRiotId(input: string): RiotId | null {
	const separator = input.indexOf("#");
	if (separator === -1) return null;

	const gameName = input.slice(0, separator).trim();
	const tagLine = input.slice(separator + 1).trim();
	if (!gameName || !tagLine) return null;

	return { gameName, tagLine };
}

/** Converts a `GameName#TAG` string straight to a `/summoner/[name]` slug. */
export function riotIdToSlug(riotId: string): string {
	const parsed = parseRiotId(riotId);
	if (!parsed) return encodeURIComponent(riotId);

	return toSummonerSlug(parsed.gameName, parsed.tagLine);
}
