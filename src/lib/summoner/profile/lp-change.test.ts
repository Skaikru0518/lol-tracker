import { describe, expect, it } from "vitest";
import { calculateLPChange, toAbsoluteLp } from "./lp-change";

const snap = (createdAt: string, tier: string, rank: string, lp: number) => ({
	id: createdAt,
	tier,
	rank,
	lp,
	wins: null,
	losses: null,
	createdAt,
});

describe("toAbsoluteLp", () => {
	it("counts 400 per tier and 100 per division", () => {
		expect(toAbsoluteLp("GOLD", "IV", 0)).toBe(1200);
		expect(toAbsoluteLp("GOLD", "I", 50)).toBe(1550);
	});

	it("ignores divisions for apex tiers", () => {
		expect(toAbsoluteLp("MASTER", "I", 120)).toBe(2920);
	});

	it("puts Master, Grandmaster and Challenger on one LP ladder", () => {
		expect(toAbsoluteLp("GRANDMASTER", "I", 520)).toBe(3320);
		expect(toAbsoluteLp("CHALLENGER", "I", 1100)).toBe(3900);
	});

	it("returns 0 for unknown tiers", () => {
		expect(toAbsoluteLp("WOOD", "I", 10)).toBe(0);
	});
});

describe("calculateLPChange", () => {
	const end = Date.parse("2026-10-02T21:00:00Z");

	it("is null with fewer than two snapshots", () => {
		expect(calculateLPChange(undefined, end)).toBeNull();
		expect(calculateLPChange([snap("2026-10-02T20:00:00Z", "EMERALD", "I", 8)], end)).toBeNull();
	});

	it("diffs the snapshots around the match end", () => {
		expect(
			calculateLPChange(
				[snap("2026-10-02T20:00:00Z", "EMERALD", "I", 8), snap("2026-10-02T21:05:00Z", "EMERALD", "I", 29)],
				end,
			),
		).toBe(21);
	});

	it("handles a promotion across divisions", () => {
		expect(
			calculateLPChange(
				[snap("2026-10-02T20:00:00Z", "EMERALD", "II", 90), snap("2026-10-02T21:05:00Z", "EMERALD", "I", 10)],
				end,
			),
		).toBe(20);
	});

	it("measures a Master to Grandmaster promotion on the shared apex ladder", () => {
		expect(
			calculateLPChange(
				[snap("2026-10-02T20:00:00Z", "MASTER", "I", 480), snap("2026-10-02T21:05:00Z", "GRANDMASTER", "I", 520)],
				end,
			),
		).toBe(40);
	});

	it("is null when several games fall between the two snapshots", () => {
		const before = { ...snap("2026-10-02T20:00:00Z", "EMERALD", "I", 8), wins: 10, losses: 5 };
		const after = { ...snap("2026-10-02T21:05:00Z", "EMERALD", "I", 8), wins: 11, losses: 6 };
		expect(calculateLPChange([before, after], end)).toBeNull();
	});

	it("keeps the delta when the snapshots are exactly one game apart", () => {
		const before = { ...snap("2026-10-02T20:00:00Z", "EMERALD", "I", 8), wins: 10, losses: 5 };
		const after = { ...snap("2026-10-02T21:05:00Z", "EMERALD", "I", 29), wins: 11, losses: 5 };
		expect(calculateLPChange([before, after], end)).toBe(21);
	});

	it("is null when no snapshot follows the match", () => {
		expect(
			calculateLPChange(
				[snap("2026-10-02T19:00:00Z", "EMERALD", "I", 8), snap("2026-10-02T20:00:00Z", "EMERALD", "I", 29)],
				end,
			),
		).toBeNull();
	});
});
