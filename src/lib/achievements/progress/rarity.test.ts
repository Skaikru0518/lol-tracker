import { describe, expect, it } from "vitest";
import { computeRarityShares } from "./rarity";

describe("computeRarityShares", () => {
	it("gives the share of players at or above each tier", () => {
		const rows = [
			{ achievementId: "veteran", scope: "all", tier: 0, count: 6 },
			{ achievementId: "veteran", scope: "all", tier: 1, count: 2 },
			{ achievementId: "veteran", scope: "all", tier: 3, count: 2 },
			{ achievementId: "hot-streak", scope: "2026", tier: 1, count: 1 },
		];
		expect(computeRarityShares(rows, 10)).toEqual({ "veteran:all": [0.4, 0.2, 0.2], "hot-streak:2026": [0.1] });
	});

	it("is empty without players", () => {
		expect(computeRarityShares([{ achievementId: "veteran", scope: "all", tier: 1, count: 1 }], 0)).toEqual({});
	});
});
