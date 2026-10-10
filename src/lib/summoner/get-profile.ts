import { cache } from "react";
import { decodeSlug, parseSummonerSlug } from "@/lib/riot-id";
import { RiotApiError } from "@/lib/riot/riot";
import { resolveAccount } from "@/lib/summoner/account";
import { resolveSummoner } from "@/lib/summoner/summoner";
import { resolveRankedEntries } from "@/lib/summoner/ranked";
import { resolveTopMasteries } from "@/lib/summoner/mastery";
import { type Account, type Summoner } from "@/lib/validators/summoner";
import { type RankedEntry } from "@/lib/validators/ranked";

export { decodeSlug };

/** Same count the mastery panel requests, so the DB never holds fewer rows than it shows. */
export const PROFILE_MASTERY_COUNT = 5;

/** Data the summoner shell (hero, tabs, metadata) renders on the server. */
export interface SummonerProfile {
	account: Account;
	summoner: Summoner;
	ranked: RankedEntry[];
	topMasteryChampionId: number | null;
}

/** Profile for a `/summoner/[name]` slug, or `null` if the Riot ID does not exist; deduped per request. */
export const getSummonerProfile = cache(
	async (slug: string): Promise<SummonerProfile | null> => {
		const { gameName, tagLine } = parseSummonerSlug(decodeSlug(slug));
		if (!gameName || !tagLine) return null;

		let account: Account;
		let summoner: Summoner;
		try {
			account = await resolveAccount(gameName, tagLine);
			summoner = await resolveSummoner(account.puuid); // 404 here: Riot ID exists on another platform
		} catch (error) {
			if (error instanceof RiotApiError && error.status === 404) return null;
			throw error;
		}

		const [ranked, masteries] = await Promise.all([
			resolveRankedEntries(account.puuid),
			resolveTopMasteries(account.puuid, PROFILE_MASTERY_COUNT).catch(() => []),
		]);

		return {
			account,
			summoner,
			ranked,
			topMasteryChampionId: masteries[0]?.championId ?? null,
		};
	},
);
