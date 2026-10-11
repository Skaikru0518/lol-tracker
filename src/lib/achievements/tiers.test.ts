import { describe, expect, it } from "vitest";
import { highestTierOrdinal, rankTierName, rankTierOrdinal, tierFor } from "./tiers";

describe("tierFor", () => {
	it("counts reached thresholds, boundaries included", () => {
		expect(tierFor(0, [50, 200, 500, 1000])).toBe(0);
		expect(tierFor(49, [50, 200, 500, 1000])).toBe(0);
		expect(tierFor(50, [50, 200, 500, 1000])).toBe(1);
		expect(tierFor(999, [50, 200, 500, 1000])).toBe(3);
		expect(tierFor(5000, [50, 200, 500, 1000])).toBe(4);
		expect(tierFor(1, [1])).toBe(1);
	});
});

describe("rank tiers", () => {
	it("orders Iron to Challenger and rejects unknown tiers", () => {
		expect(rankTierOrdinal("IRON")).toBe(0);
		expect(rankTierOrdinal("EMERALD")).toBe(5);
		expect(rankTierOrdinal("CHALLENGER")).toBe(9);
		expect(rankTierOrdinal("UNRANKED")).toBe(-1);
	});

	it("finds the highest tier, -1 for none", () => {
		expect(highestTierOrdinal(["GOLD", "DIAMOND", "EMERALD"])).toBe(6);
		expect(highestTierOrdinal([])).toBe(-1);
	});

	it("names ordinals in title case", () => {
		expect(rankTierName(8)).toBe("Grandmaster");
		expect(rankTierName(-1)).toBe("Unranked");
	});
});
