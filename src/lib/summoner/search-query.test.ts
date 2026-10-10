import { describe, expect, it } from "vitest";
import { likeLiteral, lookupCandidate, parseSearchTerms, sortExactFirst } from "./search-query";

describe("parseSearchTerms", () => {
	it("needs at least two name characters", () => {
		expect(parseSearchTerms("S")).toBeNull();
		expect(parseSearchTerms("  #EUNE")).toBeNull();
	});

	it("splits an optional tag prefix and trims", () => {
		expect(parseSearchTerms("  Skaikru ")).toEqual({ name: "Skaikru", tag: null });
		expect(parseSearchTerms("Skaikru#HE")).toEqual({ name: "Skaikru", tag: "HE" });
		expect(parseSearchTerms("Skaikru#")).toEqual({ name: "Skaikru", tag: null });
	});

	it("keeps spaces, accents and wildcard characters literally", () => {
		expect(parseSearchTerms("Mam Velke Peró%_")).toEqual({ name: "Mam Velke Peró%_", tag: null });
	});

	it("caps very long input", () => {
		expect(parseSearchTerms("a".repeat(100))?.name).toHaveLength(40);
	});
});

describe("sortExactFirst", () => {
	it("puts case-insensitive exact name matches first, keeping the rest in order", () => {
		const rows = [{ gameName: "Skaikru2" }, { gameName: "skaikru" }, { gameName: "Skaikrux" }];
		expect(sortExactFirst(rows, "Skaikru").map((r) => r.gameName)).toEqual(["skaikru", "Skaikru2", "Skaikrux"]);
	});
});

describe("lookupCandidate", () => {
	it("offers a Riot lookup for a full Riot ID that is not in the results", () => {
		expect(lookupCandidate("Faker#KR1", [])).toEqual({ gameName: "Faker", tagLine: "KR1" });
	});

	it("offers nothing when that exact account is already listed (any case)", () => {
		expect(lookupCandidate("skaikru#heavn", [{ gameName: "Skaikru", tagLine: "HEAVN" }])).toBeNull();
	});

	it("offers nothing without a tag", () => {
		expect(lookupCandidate("Skaikru", [])).toBeNull();
	});
});

describe("likeLiteral", () => {
	it("escapes LIKE wildcards and the escape character so typed text matches literally", () => {
		expect(likeLiteral(String.raw`a%b_c\d`)).toBe(String.raw`a\%b\_c\\d`);
		expect(likeLiteral("Skaikru")).toBe("Skaikru");
	});
});
