import { describe, expect, it } from "vitest";
import { rankPills } from "./rank-pills";

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

describe("rankPills", () => {
	it("orders solo before flex and formats the label", () => {
		expect(
			rankPills([entry("RANKED_FLEX_SR", "PLATINUM", "I"), entry("RANKED_SOLO_5x5", "EMERALD", "I")]),
		).toEqual([
			{ queueType: "RANKED_SOLO_5x5", label: "EMERALD I · SOLO", color: "#2ecc71" },
			{ queueType: "RANKED_FLEX_SR", label: "PLATINUM I · FLEX", color: "#4dc8b4" },
		]);
	});

	it("ignores unknown queues such as Arena or TFT", () => {
		expect(rankPills([entry("CHERRY", "GOLD", "II")])).toEqual([]);
	});

	it("falls back to a neutral color for an unknown tier", () => {
		expect(rankPills([entry("RANKED_SOLO_5x5", "WOOD", "I")])[0].color).toBe("#7d829c");
	});

	it("adds Ranked 5s after flex", () => {
		expect(
			rankPills([entry("RANKED_PREMADE_5x5", "GOLD", "II"), entry("RANKED_SOLO_5x5", "EMERALD", "I")]).map((p) => p.label),
		).toEqual(["EMERALD I · SOLO", "GOLD II · 5S"]);
	});
});
