import { describe, expect, it } from "vitest";
import { mergeExactFirst, suggestionStatus } from "./search-results";

const r = (puuid: string, gameName: string) => ({ puuid, gameName });

describe("mergeExactFirst", () => {
	it("puts exact matches first, fills with prefix matches, skips duplicates and caps the list", () => {
		const exact = [r("a", "Sk")];
		const prefix = [r("b", "Skaikru"), r("a", "Sk"), r("c", "Skye")];
		expect(mergeExactFirst(exact, prefix, 3).map((x) => x.puuid)).toEqual(["a", "b", "c"]);
		expect(mergeExactFirst(exact, prefix, 2).map((x) => x.puuid)).toEqual(["a", "b"]);
	});
});

describe("suggestionStatus", () => {
	it("prefers results, then pending, then error, then empty", () => {
		expect(suggestionStatus({ pending: true, isError: false, resultCount: 2, hasLookup: false })).toBe("results");
		expect(suggestionStatus({ pending: true, isError: false, resultCount: 0, hasLookup: false })).toBe("pending");
		expect(suggestionStatus({ pending: false, isError: true, resultCount: 0, hasLookup: false })).toBe("error");
		expect(suggestionStatus({ pending: false, isError: false, resultCount: 0, hasLookup: true })).toBe("results");
		expect(suggestionStatus({ pending: false, isError: false, resultCount: 0, hasLookup: false })).toBe("empty");
	});
});
