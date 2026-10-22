import { cache } from "react";
import { decodeSlug, parseSummonerSlug } from "@/lib/game/riot-id";
import { RiotApiError } from "@/lib/riot/riot";
import { resolveAccount } from "@/lib/summoner/profile/account";
import { locateSummoner } from "@/lib/summoner/profile/locate-summoner";
import { type Platform } from "@/lib/game/platforms";
import { resolveRankedEntries } from "@/lib/summoner/profile/ranked";
import { resolveTopMasteries } from "@/lib/summoner/champions/mastery";
import { type Account, type Summoner } from "@/lib/validators/summoner";
import { type RankedEntry } from "@/lib/validators/ranked";

export { decodeSlug };

/** Same count the mastery panel requests, so the DB never holds fewer rows than it shows. */
export const PROFILE_MASTERY_COUNT = 5;

/** Data the summoner shell (hero, tabs, metadata) renders on the server. */
export interface SummonerProfile {
	account: Account;
	summoner: Summoner;
	platform: Platform;
	ranked: RankedEntry[];
	topMasteryChampionId: number | null;
}

/** Profile for a `/summoner/[name]` slug, or `null` if the Riot ID does not exist; deduped per request. */
export const getSummonerProfile = cache(
	async (slug: string): Promise<SummonerProfile | null> => {
		const { gameName, tagLine } = parseSummonerSlug(decodeSlug(slug));
		if (!gameName || !tagLine) return null;

		let account: Account;
		try {
			account = await resolveAccount(gameName, tagLine);
		} catch (error) {
			if (error instanceof RiotApiError && error.status === 404) return null;
			throw error;
		}
		const located = await locateSummoner(account.puuid, null);
		if (!located) return null;
		const { summoner, platform } = located;

		const [ranked, masteries] = await Promise.all([
			resolveRankedEntries(account.puuid),
			resolveTopMasteries(account.puuid, PROFILE_MASTERY_COUNT).catch(() => []),
		]);

		return {
			account,
			summoner,
			platform,
			ranked,
			topMasteryChampionId: masteries[0]?.championId ?? null,
		};
	},
);
