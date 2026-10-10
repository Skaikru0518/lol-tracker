import { describe, expect, it } from "vitest";
import { sparklineIndexAt, sparklinePoints } from "./sparkline";

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

describe("sparklineIndexAt", () => {
	it("maps the edges to the first and last point", () => {
		expect(sparklineIndexAt(0, 240, 5)).toBe(0);
		expect(sparklineIndexAt(240, 240, 5)).toBe(4);
	});

	it("snaps to the nearest point", () => {
		expect(sparklineIndexAt(80, 240, 5)).toBe(1);
		expect(sparklineIndexAt(100, 240, 5)).toBe(2);
	});

	it("clamps positions outside the line", () => {
		expect(sparklineIndexAt(-10, 240, 5)).toBe(0);
		expect(sparklineIndexAt(999, 240, 5)).toBe(4);
	});

	it("is 0 for a single point or zero width", () => {
		expect(sparklineIndexAt(50, 240, 1)).toBe(0);
		expect(sparklineIndexAt(50, 0, 5)).toBe(0);
	});
});
