import { describe, expect, it } from "vitest";
import { sparklinePoints } from "./sparkline";

describe("sparklinePoints", () => {
	it("is empty without values", () => {
		expect(sparklinePoints([], 100, 40)).toBe("");
	});

	it("draws a single value as a flat line across the width", () => {
		expect(sparklinePoints([5], 100, 40)).toBe("0,20 100,20");
	});

	it("centers a flat series vertically", () => {
		expect(sparklinePoints([3, 3, 3], 100, 40)).toBe("0,20 50,20 100,20");
	});

	it("maps min to the bottom and max to the top", () => {
		expect(sparklinePoints([0, 10], 100, 40)).toBe("0,40 100,0");
	});

	it("never emits NaN", () => {
		expect(sparklinePoints([1, Number.NaN, 3], 100, 40)).not.toContain("NaN");
	});
});
