import { describe, expect, it } from "vitest";
import { asRole, ROLES } from "./roles";
import { CATEGORIES, CATEGORY_METRICS, METRIC_IDS, ROLE_WEIGHTS } from "./weights";

describe("weights", () => {
	it("sums every role's category weights to 100", () => {
		for (const role of ROLES) expect(CATEGORIES.reduce((s, c) => s + ROLE_WEIGHTS[role][c], 0)).toBe(100);
	});

	it("puts every metric in at least one category", () => {
		const used = new Set(Object.values(CATEGORY_METRICS).flat());
		expect(METRIC_IDS.filter((m) => !used.has(m))).toEqual([]);
	});
});

describe("asRole", () => {
	it("accepts Riot positions only", () => {
		expect(asRole("UTILITY")).toBe("UTILITY");
		expect(asRole("")).toBeNull();
		expect(asRole("Invalid")).toBeNull();
	});
});
