import { describe, expect, it } from "vitest";
import { baselinesSchema, matchPerformanceSchema, performanceSummariesSchema } from "./performance";

describe("baselinesSchema", () => {
	it("accepts a baseline payload with some roles", () => {
		const payload = { computedAt: "2026-10-13T03:00:00.000Z", sampleSize: 900, roles: { MIDDLE: { games: 180, metrics: { csPerMin: Array(21).fill(6) } } } };
		expect(baselinesSchema.parse(payload)).toEqual(payload);
	});

	it("allows null when no baseline exists yet", () => {
		expect(baselinesSchema.nullable().parse(null)).toBeNull();
	});
});

describe("performance payloads", () => {
	it("accepts one game's scores by puuid and list summaries by match", () => {
		const score = {
			role: "MIDDLE",
			score: 78,
			grade: "A",
			baselineGames: 1026,
			categories: [{ id: "farming", score: 81, grade: "S", metrics: [{ id: "csPerMin", value: 8.1, percentile: 81 }] }],
			opponent: { championName: "Syndra", goldDiff: 1240, xpDiff: null, csDiff: 18, damageDiff: -300 },
		};
		expect(matchPerformanceSchema.parse({ me: score })).toEqual({ me: score });
		expect(performanceSummariesSchema.parse({ EUN1_1: { score: 78, grade: "A" }, EUN1_2: null })).toEqual({ EUN1_1: { score: 78, grade: "A" }, EUN1_2: null });
	});
});
