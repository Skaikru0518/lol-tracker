import { describe, expect, it } from "vitest";
import { parseSearchHistory } from "./search-history";

describe("parseSearchHistory", () => {
	it("returns an empty list for null", () => {
		expect(parseSearchHistory(null)).toEqual([]);
	});

	it("parses a stored list", () => {
		expect(parseSearchHistory('["Skaikru#HEAVN","Nyzor#420"]')).toEqual([
			"Skaikru#HEAVN",
			"Nyzor#420",
		]);
	});

	it("returns an empty list for corrupt JSON", () => {
		expect(parseSearchHistory("{not json")).toEqual([]);
	});

	it("returns an empty list for non-array JSON", () => {
		expect(parseSearchHistory('{"a":1}')).toEqual([]);
		expect(parseSearchHistory('"Skaikru#HEAVN"')).toEqual([]);
	});

	it("drops non-string entries", () => {
		expect(parseSearchHistory('["Skaikru#HEAVN",42,null,{"x":1}]')).toEqual([
			"Skaikru#HEAVN",
		]);
	});
});
