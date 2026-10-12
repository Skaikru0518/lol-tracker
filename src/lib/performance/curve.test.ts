import { describe, expect, it } from "vitest";
import { curveScore } from "./curve";

describe("curveScore", () => {
	it("maps percentiles onto the friendlier score scale", () => {
		expect(curveScore(0)).toBe(20);
		expect(curveScore(8)).toBe(40);
		expect(curveScore(50)).toBe(65);
		expect(curveScore(80)).toBe(80);
		expect(curveScore(93)).toBe(90);
		expect(curveScore(100)).toBe(100);
	});

	it("puts the agreed share of games into each grade", () => {
		expect(curveScore(92.9)).toBeLessThan(90);
		expect(curveScore(60)).toBe(70);
		expect(curveScore(30)).toBe(55);
	});
});
