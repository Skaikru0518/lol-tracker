import { describe, expect, it } from "vitest";
import { recentSearchRank, rotationChampions } from "./format";

const search = (soloTier: string | null, soloRank: string | null, soloLp: number | null) => ({
	puuid: "p",
	gameName: "Skaikru",
	tagLine: "HEAVN",
	profileIconId: 1,
	soloTier,
	soloRank,
	soloLp,
});

describe("recentSearchRank", () => {
	it("formats tier, division and LP", () => {
		expect(recentSearchRank(search("EMERALD", "I", 42))).toBe("Emerald I · 42 LP");
	});

	it("drops the division for apex tiers", () => {
		expect(recentSearchRank(search("MASTER", "I", 212))).toBe("Master · 212 LP");
	});

	it("is Unranked without a solo entry", () => {
		expect(recentSearchRank(search(null, null, null))).toBe("Unranked");
	});
});

describe("rotationChampions", () => {
	const champions = {
		266: { id: "Aatrox", key: "266", name: "Aatrox" },
		103: { id: "Ahri", key: "103", name: "Ahri" },
	};

	it("maps ids to champions sorted by name and skips unknown ids", () => {
		expect(rotationChampions([103, 999, 266], champions).map((c) => c.name)).toEqual(["Aatrox", "Ahri"]);
	});

	it("is empty while the champion map is loading", () => {
		expect(rotationChampions([103], undefined)).toEqual([]);
	});
});
