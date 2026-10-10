import { describe, expect, it } from "vitest";
import { buildTabHref, isTabActive } from "./tabs";

describe("buildTabHref", () => {
	it("returns the base path for the index tab", () => {
		expect(buildTabHref("/summoner/Skaikru-HEAVN", null)).toBe(
			"/summoner/Skaikru-HEAVN",
		);
	});

	it("appends the segment", () => {
		expect(buildTabHref("/summoner/Skaikru-HEAVN", "lp")).toBe(
			"/summoner/Skaikru-HEAVN/lp",
		);
	});

	it("does not double the slash when the base ends with one", () => {
		expect(buildTabHref("/summoner/Skaikru-HEAVN/", "champions")).toBe(
			"/summoner/Skaikru-HEAVN/champions",
		);
	});

	it("strips the trailing slash for the index tab", () => {
		expect(buildTabHref("/summoner/Skaikru-HEAVN/", null)).toBe(
			"/summoner/Skaikru-HEAVN",
		);
	});
});

describe("isTabActive", () => {
	it("matches the index tab when no child segment is selected", () => {
		expect(isTabActive(null, null)).toBe(true);
	});

	it("matches an equal segment", () => {
		expect(isTabActive("champions", "champions")).toBe(true);
	});

	it("does not match a different segment", () => {
		expect(isTabActive("lp", "champions")).toBe(false);
	});

	it("does not mark the index tab active on a child segment", () => {
		expect(isTabActive("lp", null)).toBe(false);
	});
});
