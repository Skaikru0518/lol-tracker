import { describe, expect, it } from "vitest";
import { toRecentSearch } from "./recent-searches";

const base = { puuid: "p1", gameName: "Skaikru", tagLine: "HEAVN" };

describe("toRecentSearch", () => {
	it("takes the solo queue rank and the profile icon", () => {
		expect(
			toRecentSearch({
				...base,
				summoner: { profileIconId: 6643 },
				rankedEntries: [
					{ queueType: "RANKED_FLEX_SR", tier: "PLATINUM", rank: "I", leaguePoints: 76 },
					{ queueType: "RANKED_SOLO_5x5", tier: "EMERALD", rank: "I", leaguePoints: 8 },
				],
			}),
		).toEqual({ ...base, profileIconId: 6643, soloTier: "EMERALD", soloRank: "I", soloLp: 8 });
	});

	it("returns null rank fields for an unranked player", () => {
		expect(toRecentSearch({ ...base, summoner: { profileIconId: 1 }, rankedEntries: [] })).toEqual({
			...base,
			profileIconId: 1,
			soloTier: null,
			soloRank: null,
			soloLp: null,
		});
	});

	it("drops accounts without a summoner on this platform", () => {
		expect(toRecentSearch({ ...base, summoner: null, rankedEntries: [] })).toBeNull();
	});

	it("ignores flex when there is no solo entry", () => {
		const result = toRecentSearch({
			...base,
			summoner: { profileIconId: 1 },
			rankedEntries: [{ queueType: "RANKED_FLEX_SR", tier: "GOLD", rank: "II", leaguePoints: 10 }],
		});
		expect(result).not.toBeNull();
		expect(result!.soloTier).toBeNull();
	});
});
