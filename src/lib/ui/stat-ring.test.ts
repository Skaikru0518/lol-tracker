import { describe, expect, it } from "vitest";
import { ringOffset } from "./stat-ring";

const C = 100;

describe("ringOffset", () => {
	it("is the full circumference at 0", () => {
		expect(ringOffset(0, 100, C)).toBe(100);
	});

	it("is half the circumference at 50%", () => {
		expect(ringOffset(50, 100, C)).toBe(50);
	});

	it("is 0 at max", () => {
		expect(ringOffset(100, 100, C)).toBe(0);
	});

	it("clamps values above max", () => {
		expect(ringOffset(250, 100, C)).toBe(0);
	});

	it("clamps negative values", () => {
		expect(ringOffset(-20, 100, C)).toBe(100);
	});

	it("treats NaN as empty", () => {
		expect(ringOffset(Number.NaN, 100, C)).toBe(100);
	});

	it("treats a non-positive max as empty", () => {
		expect(ringOffset(5, 0, C)).toBe(100);
	});

	it("supports a non-100 max", () => {
		expect(ringOffset(7.4, 10, C)).toBeCloseTo(26);
	});
});
