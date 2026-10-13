import { describe, expect, it } from "vitest";
import { baseRankAt, performanceRank } from "./performance-rank";

const cutoff = { grandmaster: 250, challenger: 600 };
const snap = (createdAt: string, tier: string, rank: string, lp: number) => ({ id: createdAt, tier, rank, lp, wins: null, losses: null, createdAt });
const at = (iso: string) => Date.parse(iso);

describe("baseRankAt", () => {
	const snapshots = [snap("2026-01-05T10:00:00Z", "DIAMOND", "II", 40), snap("2026-01-12T10:00:00Z", "EMERALD", "I", 10)];
	const current = { tier: "EMERALD", rank: "III", leaguePoints: 70 };

	it("uses the latest snapshot before the game, not the current rank", () => {
		expect(baseRankAt(snapshots, at("2026-01-08T10:00:00Z"), current)).toEqual({ tier: "DIAMOND", rank: "II", lp: 40 });
	});

	it("falls back to the first snapshot after the game", () => {
		expect(baseRankAt(snapshots, at("2026-01-01T10:00:00Z"), current)).toEqual({ tier: "DIAMOND", rank: "II", lp: 40 });
	});

	it("falls back to the current rank, then to nothing", () => {
		expect(baseRankAt([], at("2026-01-08T10:00:00Z"), current)).toEqual({ tier: "EMERALD", rank: "III", lp: 70 });
		expect(baseRankAt(undefined, at("2026-01-08T10:00:00Z"), undefined)).toBeNull();
	});
});

describe("performanceRank", () => {
	const emerald2 = { tier: "EMERALD", rank: "II", lp: 77 };

	it("moves round((score − 65) / 8) divisions from the division start", () => {
		expect(performanceRank(emerald2, 90, cutoff)).toEqual({ tier: "DIAMOND", rank: "III" });
		expect(performanceRank(emerald2, 65, cutoff)).toEqual({ tier: "EMERALD", rank: "II" });
		expect(performanceRank(emerald2, 40, cutoff)).toEqual({ tier: "PLATINUM", rank: "I" });
	});

	it("clamps the offset to four divisions", () => {
		expect(performanceRank(emerald2, 0, cutoff)).toEqual({ tier: "PLATINUM", rank: "II" });
	});

	it("never goes more than one tier above the base", () => {
		expect(performanceRank({ tier: "DIAMOND", rank: "I", lp: 90 }, 100, cutoff)).toEqual({ tier: "MASTER", rank: "" });
	});

	it("never goes more than one tier below the base", () => {
		expect(performanceRank({ tier: "CHALLENGER", rank: "I", lp: 900 }, 0, null)).toEqual({ tier: "GRANDMASTER", rank: "" });
	});

	it("keeps LP for apex bases", () => {
		expect(performanceRank({ tier: "MASTER", rank: "I", lp: 200 }, 90, cutoff)).toEqual({ tier: "GRANDMASTER", rank: "" });
		expect(performanceRank({ tier: "GRANDMASTER", rank: "I", lp: 400 }, 100, cutoff)).toEqual({ tier: "CHALLENGER", rank: "" });
		expect(performanceRank({ tier: "GRANDMASTER", rank: "I", lp: 400 }, 40, cutoff)).toEqual({ tier: "MASTER", rank: "" });
	});
});
