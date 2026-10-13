import { describe, expect, it } from "vitest";
import { radarLabelAnchor, radarPoint } from "./radar";

describe("radarPoint", () => {
	it("starts at the top and goes clockwise", () => {
		const top = radarPoint(0, 6, 100, 50);
		expect(top.x).toBeCloseTo(0);
		expect(top.y).toBeCloseTo(-50);
		const right = radarPoint(1, 4, 100, 50);
		expect(right.x).toBeCloseTo(50);
		expect(right.y).toBeCloseTo(0);
	});

	it("scales the distance by the value out of 100", () => {
		expect(radarPoint(0, 6, 50, 50).y).toBeCloseTo(-25);
	});

	it("clamps values outside 0-100", () => {
		expect(radarPoint(0, 6, 140, 50).y).toBeCloseTo(-50);
		expect(radarPoint(0, 6, -10, 50).y).toBeCloseTo(0);
	});
});

describe("radarLabelAnchor", () => {
	it("anchors side labels away from the chart and centers top and bottom", () => {
		expect([0, 1, 2, 3, 4, 5].map((i) => radarLabelAnchor(i, 6))).toEqual(["middle", "start", "start", "middle", "end", "end"]);
	});
});
