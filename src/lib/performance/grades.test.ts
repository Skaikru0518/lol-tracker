import { describe, expect, it } from "vitest";
import { gradeBands, gradeFor } from "./grades";

describe("gradeFor", () => {
	it("maps score boundaries to grades", () => {
		expect([100, 90, 89, 80, 79, 70, 69, 55, 54, 40, 39, 0].map(gradeFor)).toEqual(["S+", "S+", "S", "S", "A", "A", "B", "B", "C", "C", "D", "D"]);
	});
});

describe("gradeBands", () => {
	it("spans 0-100 from the lowest grade up", () => {
		expect(gradeBands()).toEqual([
			{ grade: "D", min: 0, max: 40 },
			{ grade: "C", min: 40, max: 55 },
			{ grade: "B", min: 55, max: 70 },
			{ grade: "A", min: 70, max: 80 },
			{ grade: "S", min: 80, max: 90 },
			{ grade: "S+", min: 90, max: 100 },
		]);
	});
});
