import { describe, expect, it } from "vitest";
import { getChampionSplash, getRankEmblem, getSummonerSpellName, knownSummonerSpellIcon } from "./icon-helpers";

describe("getChampionSplash", () => {
	it("builds the default skin splash URL", () => {
		expect(getChampionSplash("MissFortune")).toBe(
			"https://ddragon.leagueoflegends.com/cdn/img/champion/splash/MissFortune_0.jpg",
		);
	});

	it("applies the Fiddlesticks id fix", () => {
		expect(getChampionSplash("FiddleSticks")).toContain("/Fiddlesticks_0.jpg");
	});

	it("uses the given skin number", () => {
		expect(getChampionSplash("Ahri", 7)).toContain("/Ahri_7.jpg");
	});

	it("falls back to skin 0 for invalid skin numbers", () => {
		expect(getChampionSplash("Ahri", -3)).toContain("/Ahri_0.jpg");
		expect(getChampionSplash("Ahri", 2.6)).toContain("/Ahri_2.jpg");
	});
});

describe("getRankEmblem", () => {
	it("maps an upper-case tier to its local emblem", () => {
		expect(getRankEmblem("EMERALD")).toBe("/icons/rank/emerald.png");
	});

	it("accepts lower-case tiers", () => {
		expect(getRankEmblem("grandmaster")).toBe("/icons/rank/grandmaster.png");
	});

	it.each(["", "UNRANKED", "NONE", "WOOD", null, undefined])(
		"falls back to unranked for %j",
		(tier) => {
			expect(getRankEmblem(tier)).toBe("/icons/rank/unranked.png");
		},
	);
});

describe("summoner spell names and icons", () => {
	it("names known spells by their in-game name", () => {
		expect(getSummonerSpellName(14)).toBe("Ignite");
		expect(getSummonerSpellName(32)).toBe("Mark");
	});

	it("has no name or icon for unknown spell ids instead of falling back to Flash", () => {
		expect(getSummonerSpellName(2202)).toBeNull();
		expect(knownSummonerSpellIcon("16.20.1", 2202)).toBeNull();
		expect(knownSummonerSpellIcon("16.20.1", 4)).toContain("SummonerFlash.png");
	});
});
