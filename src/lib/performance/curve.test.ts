import { describe, expect, it } from "vitest";
import { curveScore } from "./curve";

describe("curveScore", () => {
	it("maps percentiles onto the friendlier score scale", () => {
		expect(curveScore(0)).toBe(15);
		expect(curveScore(10)).toBe(40);
		expect(curveScore(50)).toBe(62.5);
		expect(curveScore(85)).toBe(80);
		expect(curveScore(95)).toBe(90);
		expect(curveScore(100)).toBe(100);
	});

	it("puts the agreed share of games into each grade", () => {
		expect(curveScore(94.9)).toBeLessThan(90);
		expect(curveScore(65)).toBe(70);
		expect(curveScore(35)).toBe(55);
	});
});
