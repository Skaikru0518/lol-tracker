import { describe, expect, it } from "vitest";
import { gradeFor } from "./grades";

describe("gradeFor", () => {
	it("maps score boundaries to grades", () => {
		expect([100, 90, 89, 80, 79, 70, 69, 55, 54, 40, 39, 0].map(gradeFor)).toEqual(["S+", "S+", "S", "S", "A", "A", "B", "B", "C", "C", "D", "D"]);
	});
});
