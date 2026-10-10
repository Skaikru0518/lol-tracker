import { describe, expect, it } from "vitest";
import { buildProfileMetadata } from "./metadata";

const base = {
	account: { puuid: "p1", gameName: "Skaikru", tagLine: "HEAVN" },
	summoner: { puuid: "p1", profileIconId: 1, summonerLevel: 692, revisionDate: 1 },
	topMasteryChampionId: null,
};

const solo = {
	queueType: "RANKED_SOLO_5x5",
	tier: "EMERALD",
	rank: "I",
	leaguePoints: 8,
	wins: 150,
	losses: 129,
	hotStreak: false,
	veteran: false,
	freshBlood: false,
	inactive: false,
};

describe("buildProfileMetadata", () => {
	it("puts the Riot ID and solo rank in the title", () => {
		const meta = buildProfileMetadata({ ...base, ranked: [solo] });
		expect(meta.title).toBe("Skaikru#HEAVN — Emerald I");
		expect(meta.description).toContain("Emerald I 8 LP");
		expect(meta.description).toContain("150W 129L");
		expect(meta.description).toContain("Level 692");
	});

	it("drops the division for apex tiers", () => {
		const meta = buildProfileMetadata({ ...base, ranked: [{ ...solo, tier: "MASTER", rank: "I", leaguePoints: 212 }] });
		expect(meta.title).toBe("Skaikru#HEAVN — Master");
	});

	it("labels players without a solo entry as unranked", () => {
		const meta = buildProfileMetadata({
			...base,
			ranked: [{ ...solo, queueType: "RANKED_FLEX_SR" }],
		});
		expect(meta.title).toBe("Skaikru#HEAVN — Unranked");
		expect(meta.description).not.toContain("Ranked Solo:");
	});
});
