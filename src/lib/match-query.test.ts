import { describe, expect, it } from "vitest";
import { parseChampionId, parseMatchCount } from "./match-query";

describe("parseMatchCount", () => {
	it("defaults to 20", () => {
		expect(parseMatchCount(null)).toBe(20);
	});

	it("clamps to 1..100", () => {
		expect(parseMatchCount("100000")).toBe(100);
		expect(parseMatchCount("0")).toBe(1);
		expect(parseMatchCount("-5")).toBe(1);
	});

	it("falls back to 20 for non-numbers", () => {
		expect(parseMatchCount("abc")).toBe(20);
	});
});

describe("parseChampionId", () => {
	it("is undefined when missing", () => {
		expect(parseChampionId(null)).toBeUndefined();
	});

	it("parses a positive integer", () => {
		expect(parseChampionId("267")).toBe(267);
	});

	it("is null for invalid values", () => {
		expect(parseChampionId("abc")).toBeNull();
		expect(parseChampionId("-1")).toBeNull();
	});
});
