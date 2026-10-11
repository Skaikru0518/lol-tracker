import { describe, expect, it } from "vitest";
import { hasSeasonData, seasonsToCompute } from "./backfill";

const now = new Date("2026-10-11T12:00:00Z");

describe("seasonsToCompute", () => {
	it("backfills a closed season once, then only the current season", () => {
		expect(seasonsToCompute(new Set(["all"]), now).map((s) => [s.season.id, s.closed])).toEqual([["2025", true], ["2026", false]]);
		expect(seasonsToCompute(new Set(["all", "2025", "2026"]), now).map((s) => s.season.id)).toEqual(["2026"]);
	});
});

describe("hasSeasonData", () => {
	it("is false for a season without games or snapshots", () => {
		expect(hasSeasonData({ champions: [], games: [], snapshots: [], ranked: null })).toBe(false);
		expect(hasSeasonData({ champions: [], games: [], snapshots: [{ queueType: "RANKED_SOLO_5x5", tier: "GOLD", createdAt: now }], ranked: null })).toBe(true);
	});
});
