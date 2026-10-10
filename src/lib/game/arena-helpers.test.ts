import { describe, expect, it } from "vitest";
import { isArenaMatch } from "./arena-helpers";

describe("isArenaMatch", () => {
	it.each([1700, 1710, 1750])("treats %i as Arena", (queueId) => {
		expect(isArenaMatch(queueId)).toBe(true);
	});

	it("is false for Summoner's Rift", () => {
		expect(isArenaMatch(420)).toBe(false);
	});
});
