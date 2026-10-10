import { describe, expect, it } from "vitest";
import { donutGradient, roleShares } from "./roles";

describe("roleShares", () => {
	it("sorts by count and computes whole-percent shares", () => {
		expect(roleShares({ ADC: 11, Support: 38, Jungle: 1 })).toEqual([
			{ role: "Support", count: 38, share: 76 },
			{ role: "ADC", count: 11, share: 22 },
			{ role: "Jungle", count: 1, share: 2 },
		]);
	});

	it("is empty when there are no roles", () => {
		expect(roleShares({})).toEqual([]);
	});
});

describe("donutGradient", () => {
	it("builds cumulative conic stops", () => {
		expect(
			donutGradient(
				[
					{ role: "Support", count: 3, share: 75 },
					{ role: "ADC", count: 1, share: 25 },
				],
				["#a", "#b"],
			),
		).toBe("conic-gradient(#a 0% 75%, #b 75% 100%)");
	});

	it("falls back to the border color when empty", () => {
		expect(donutGradient([], ["#a"])).toBe("conic-gradient(var(--border) 0% 100%)");
	});
});
