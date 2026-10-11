import { describe, expect, it } from "vitest";
import { SEASONS, currentSeason, seasonFor, seasonRange } from "./seasons";

describe("seasons", () => {
	it("starts each ranked year at the Riot reset", () => {
		expect(SEASONS.map((s) => s.id)).toEqual(["2025", "2026"]);
		expect(seasonRange(SEASONS[0])).toEqual({ from: new Date("2025-01-09T11:00:00Z"), to: new Date("2026-01-08T11:00:00Z") });
		expect(seasonRange(SEASONS[1]).to).toBeNull();
	});

	it("picks the season a date falls in", () => {
		expect(seasonFor(new Date("2026-01-08T10:59:59Z"))?.id).toBe("2025");
		expect(seasonFor(new Date("2026-01-08T11:00:00Z"))?.id).toBe("2026");
		expect(seasonFor(new Date("2024-06-01T00:00:00Z"))).toBeNull();
	});

	it("treats the latest started season as current", () => {
		expect(currentSeason(new Date("2026-10-11T00:00:00Z")).id).toBe("2026");
		expect(currentSeason(new Date("2025-03-01T00:00:00Z")).id).toBe("2025");
	});
});
