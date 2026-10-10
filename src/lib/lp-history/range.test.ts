import { describe, expect, it } from "vitest";
import { lpRangeStart, parseLpRange, SEASON_START } from "./range";

const now = new Date("2026-10-10T12:00:00Z");

describe("parseLpRange", () => {
	it("keeps the legacy behaviour when missing", () => {
		expect(parseLpRange(null)).toBe("legacy");
	});

	it.each(["7d", "30d", "season"])("accepts %s", (value) => {
		expect(parseLpRange(value)).toBe(value);
	});

	it.each(["", "1y", "7D", "all"])("rejects %j", (value) => {
		expect(parseLpRange(value)).toBeNull();
	});
});

describe("lpRangeStart", () => {
	it("goes back 7 days", () => {
		expect(lpRangeStart("7d", now).toISOString()).toBe("2026-10-03T12:00:00.000Z");
	});

	it("goes back 30 days", () => {
		expect(lpRangeStart("30d", now).toISOString()).toBe("2026-09-10T12:00:00.000Z");
	});

	it("uses the season start", () => {
		expect(lpRangeStart("season", now)).toEqual(SEASON_START);
	});
});
