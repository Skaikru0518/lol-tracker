import { describe, expect, it } from "vitest";
import { calculateAvgRank } from "./rank-calculator";

const entry = (queueType: string, tier: string, rank: string) => ({
	queueType,
	tier,
	rank,
	leaguePoints: 0,
	wins: 0,
	losses: 0,
	hotStreak: false,
	veteran: false,
	freshBlood: false,
	inactive: false,
});

const ranks = {
	a: [entry("RANKED_SOLO_5x5", "DIAMOND", "I"), entry("RANKED_PREMADE_5x5", "GOLD", "II")],
	b: [entry("RANKED_SOLO_5x5", "DIAMOND", "I"), entry("RANKED_PREMADE_5x5", "GOLD", "II")],
};

describe("calculateAvgRank", () => {
	it("uses solo ranks for solo games", () => {
		expect(calculateAvgRank(ranks, 420)?.tier).toBe("DIAMOND");
	});

	it("uses Ranked 5s ranks for queue 710", () => {
		expect(calculateAvgRank(ranks, 710)).toMatchObject({ tier: "GOLD", rank: "II" });
	});
});
