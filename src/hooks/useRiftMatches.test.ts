import { describe, expect, it } from "vitest";
import { riftMatchesKey } from "./useRiftMatches";

describe("riftMatchesKey", () => {
	it("changes when a newer game reaches the match list", () => {
		expect(riftMatchesKey("p", "EUN1_2")).not.toEqual(riftMatchesKey("p", "EUN1_1"));
	});

	it("stays under the matches prefix the refresh button invalidates", () => {
		expect(riftMatchesKey("p", undefined)).toEqual(["matches", "p", "rift", null]);
	});
});
