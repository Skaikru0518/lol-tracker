import { describe, expect, it } from "vitest";
import { percentileOf, QUANTILE_STEPS } from "./percentile";

const linear = Array.from({ length: 21 }, (_, i) => i);

describe("QUANTILE_STEPS", () => {
	it("runs from 0 to 1 in 5% steps", () => {
		expect(QUANTILE_STEPS).toHaveLength(21);
		expect(QUANTILE_STEPS[0]).toBe(0);
		expect(QUANTILE_STEPS[20]).toBe(1);
		expect(QUANTILE_STEPS[10]).toBeCloseTo(0.5);
	});
});

describe("percentileOf", () => {
	it("interpolates between quantiles", () => {
		expect(percentileOf(10, linear)).toBe(50);
		expect(percentileOf(2.5, linear)).toBe(12.5);
	});

	it("clamps outside the distribution", () => {
		expect(percentileOf(-1, linear)).toBe(0);
		expect(percentileOf(99, linear)).toBe(100);
	});

	it("puts a value inside a flat run at the run's middle", () => {
		const zeroHeavy = [...Array(10).fill(0), ...Array.from({ length: 11 }, (_, i) => i + 1)];
		expect(percentileOf(0, zeroHeavy)).toBe(22.5);
	});
});
